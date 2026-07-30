#!/usr/bin/env python3
"""
추천사양 템플릿 3종(가성비 / 중급 / 고급)을 실제 부품으로 구성해 등록한다.

통화(2026-07-11) 요청:
  "그냥 이제 출전사항 1 2 3 정도 해 가지고 클릭하면"
  — 미리 짜둔 구성을 클릭 한 번으로 견적에 펼치는 기능.

부품 ID를 SQL에 박아넣지 않고 등급(RC_A~RC_F / G_A~G_F)을 기준으로 고른 뒤
호환성 규칙(DDR 세대, GPU 길이, 쿨러 높이, 폼팩터)을 통과하는 조합만 채택한다.
compatibility.ts와 같은 규칙을 파이썬으로 옮겨 적용하므로,
템플릿이 만들어졌다는 것 자체가 규칙을 통과했다는 뜻이다.

사용법:
  python3 scripts/seed_templates.py [--dry-run]
"""

import argparse
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = REPO_ROOT / "apps" / "web" / ".env.local"

# 티어별 선호 등급 (앞쪽부터 우선). A가 최상위, F가 엔트리.
TIERS = [
    {
        "name": "가성비형",
        "description": "사무용·학습용에 충분한 최소 구성",
        "cpu_grades": ["RC_F", "RC_E", "RC_D"],
        "board_grades": ["RC_F", "RC_E", "RC_D"],
        "gpu_grades": ["G_F", "G_E"],
        "price_ratio": 0.15,
        "sort_order": 1,
    },
    {
        "name": "중급형",
        "description": "일반 업무와 가벼운 작업까지 무난한 균형 구성",
        "cpu_grades": ["RC_C", "RC_D", "RC_B"],
        "board_grades": ["RC_C", "RC_D", "RC_B"],
        "gpu_grades": ["G_D", "G_C"],
        "price_ratio": 0.45,
        "sort_order": 2,
    },
    {
        "name": "고급형",
        "description": "영상 편집·고사양 작업용 상위 구성",
        "cpu_grades": ["RC_A", "RC_B"],
        "board_grades": ["RC_A", "RC_B"],
        "gpu_grades": ["G_A", "G_B"],
        "price_ratio": 0.8,
        "sort_order": 3,
    },
]

PLATFORM = "amd"


def load_env():
    env = {}
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    url = env.get("NEXT_PUBLIC_SUPABASE_URL")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 필요합니다")
    return url.rstrip("/"), key


def api(url, key, path, method="GET", body=None, prefer=None):
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    req = urllib.request.Request(
        f"{url}/rest/v1/{path}",
        data=json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None,
        headers=headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        sys.exit(f"{method} {path} 실패: HTTP {e.code}\n{e.read().decode('utf-8','replace')}")


# ── compatibility.ts와 동일한 판정 규칙 ────────────────────────

def ddr_of(part, spec_key):
    """스펙 → 제품명 순으로 DDR 세대를 본다 (compatibility.ts의 partDdr와 동일)."""
    for source in (part["specs"].get(spec_key), part["name"]):
        if isinstance(source, str):
            m = re.search(r"DDR\s*([345])", source.upper())
            if m:
                return f"DDR{m.group(1)}"
    return None


FORM_RANK = {"M-ATX": 1, "ATX": 2, "E-ATX": 3}


def case_max_rows(spec):
    if not spec:
        return None
    if "불가" in spec:
        return 0
    m = re.search(r"(\d)\s*열", spec)
    return int(m.group(1)) if m else None


def board_fits_case(board, case):
    b, s = board["specs"].get("form_factor"), case["specs"].get("form_factor")
    if not b or not s:
        return True  # 판단 불가 — 다른 후보를 먼저 쓰되 배제하지는 않는다
    # BTF(후면 커넥터) 보드만 전용 케이스가 필요하다.
    # 반대로 BTF 케이스는 일반 보드도 수용한다. (compatibility.ts와 동일)
    if b == "BTF":
        return s == "BTF"
    if s == "BTF":
        return True
    rb, rs = FORM_RANK.get(b), FORM_RANK.get(s)
    return not (rb and rs and rb > rs)


def gpu_fits_case(gpu, case):
    l, m = gpu["specs"].get("length_mm"), case["specs"].get("gpu_max_mm")
    if not isinstance(l, int) or not isinstance(m, int):
        return True
    return l <= m


def cooler_fits_case(cooler, case):
    kind = cooler["specs"].get("cooler_type")
    if kind == "air":
        h, m = cooler["specs"].get("height_mm"), case["specs"].get("cooler_max_mm")
        if not isinstance(h, int) or not isinstance(m, int):
            return True
        return h <= m
    if kind == "liquid":
        rows = cooler["specs"].get("radiator_rows")
        allowed = case_max_rows(case["specs"].get("liquid_cooling"))
        if allowed == 0:
            return False
        if not isinstance(rows, int) or allowed is None:
            return True
        return rows <= allowed
    return True


# ── 선택 로직 ────────────────────────────────────────────────

def available(parts):
    """품절이 아닌 것을 우선한다."""
    fresh = [p for p in parts if not p["sold_out"]]
    return fresh or parts


def pick_by_grade(parts, grades):
    for g in grades:
        got = available([p for p in parts if p["grade"] == g])
        if got:
            return got
    return available(parts)


def real_products(parts):
    """
    부품단가 시트에는 실제 상품이 아닌 항목이 섞여 있다.
      "Radeon™ Graphics" / "Intel™ Graphics" — CPU 내장그래픽(0원)
      "기존보유 2060" / "라데온 VII 구형(기존보유)" — 고객이 이미 가진 부품
    견적 화면에서는 골라야 할 이유가 있지만, 자동 구성 템플릿에는 넣지 않는다.
    """
    return [
        p for p in parts
        if p["price"] > 0 and "기존보유" not in p["name"] and "Graphics" != p["name"].split()[-1]
    ]


def pick_at(parts, ratio):
    """가격 오름차순 목록에서 티어에 맞는 위치의 부품을 고른다."""
    if not parts:
        return None
    idx = min(len(parts) - 1, max(0, round((len(parts) - 1) * ratio)))
    return parts[idx]


def build_tier(tier, by_cat):
    """한 티어의 구성을 만든다. 호환되지 않으면 None을 반환한다."""
    chosen = {}

    cpu_pool = pick_by_grade(by_cat["cpu"], tier["cpu_grades"])
    if not cpu_pool:
        return None, "CPU 후보 없음"
    cpu = cpu_pool[len(cpu_pool) // 2]
    chosen["cpu"] = cpu

    cpu_ddr = ddr_of(cpu, "memory_support")

    # 마더보드 — CPU와 같은 DDR 세대만
    board_pool = [
        b for b in pick_by_grade(by_cat["mainboard"], tier["board_grades"])
        if not cpu_ddr or ddr_of(b, "memory_support") in (None, cpu_ddr)
    ]
    if not board_pool:
        board_pool = [
            b for b in by_cat["mainboard"]
            if not cpu_ddr or ddr_of(b, "memory_support") == cpu_ddr
        ]
    if not board_pool:
        return None, "마더보드 후보 없음"
    board = board_pool[0]
    chosen["mainboard"] = board

    target_ddr = ddr_of(board, "memory_support") or cpu_ddr

    # 메모리 — 보드와 같은 세대
    mem_pool = [m for m in available(by_cat["memory"]) if ddr_of(m, "ddr_type") == target_ddr]
    if not mem_pool:
        return None, f"{target_ddr} 메모리 후보 없음"
    chosen["memory"] = mem_pool[len(mem_pool) // 3]

    ratio = tier["price_ratio"]
    chosen["ssd"] = pick_at(available(by_cat["ssd"]), ratio)

    gpu_pool = pick_by_grade(real_products(by_cat["gpu"]), tier["gpu_grades"])
    gpu = pick_at(gpu_pool, 0.5) if gpu_pool else None
    if gpu:
        chosen["gpu"] = gpu

    # 케이스·쿨러 — 자동 구성이므로 "판단 불가"는 통과로 치지 않는다.
    # 스펙이 확인된 부품 중에서만 고른다(사용자 견적의 관대한 폴백과 다른 점).
    cooler_pool = [
        c for c in available(by_cat["cpu_cooler"])
        if c["specs"].get("cooler_type") in ("air", "liquid")
    ]
    case_pool = [
        c for c in available(by_cat["case"])
        if isinstance(c["specs"].get("gpu_max_mm"), int)
        and isinstance(c["specs"].get("cooler_max_mm"), int)
        and board_fits_case(board, c)
        and (not gpu or gpu_fits_case(gpu, c))
    ]
    if not case_pool:
        return None, "GPU·마더보드가 들어가는 케이스 없음"

    # 티어에 맞는 가격대부터 보되, 쿨러까지 맞는 조합을 찾는다.
    start = case_pool.index(pick_at(case_pool, ratio))
    order = list(range(start, len(case_pool))) + list(range(start - 1, -1, -1))

    picked_case = picked_cooler = None
    for i in order:
        case = case_pool[i]
        fitting = [c for c in cooler_pool if cooler_fits_case(c, case)]
        if fitting:
            picked_case = case
            picked_cooler = pick_at(fitting, ratio)
            break
    if not picked_case:
        return None, "호환되는 케이스·쿨러 조합 없음"
    chosen["case"] = picked_case
    chosen["cpu_cooler"] = picked_cooler

    psu_pool = available(by_cat["psu"])
    # VRAM 12GB 이상이면 650W 이상 (compatibility.ts의 권고 규칙)
    vram = gpu["specs"].get("vram_gb") if gpu else None
    if isinstance(vram, int) and vram >= 12:
        strong = [p for p in psu_pool if isinstance(p["specs"].get("watt"), int) and p["specs"]["watt"] >= 650]
        psu_pool = strong or psu_pool
    chosen["psu"] = pick_at(psu_pool, ratio)

    labor = available(by_cat.get("labor_as", []))
    if labor:
        chosen["labor_as"] = pick_at(labor, ratio)

    return chosen, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    url, key = load_env()

    parts = api(url, key, "parts?select=*&active=is.true&order=price&limit=1000")
    by_cat = {}
    for p in parts:
        if p["platform"] not in (PLATFORM, "common"):
            continue
        p["specs"] = p["specs"] or {}
        by_cat.setdefault(p["category"], []).append(p)

    print(f"부품 {len(parts)}건 로드 ({PLATFORM.upper()}/공용 기준)\n")

    built = []
    for tier in TIERS:
        chosen, err = build_tier(tier, by_cat)
        if err:
            print(f"❌ {tier['name']}: {err}")
            continue
        total = sum(p["price"] for p in chosen.values())
        print(f"✅ {tier['name']}  합계 {total:,}원")
        for cat, p in chosen.items():
            print(f"     {cat:11s} {p['name'][:48]:50s} {p['price']:>9,}원")
        print()
        built.append((tier, chosen))

    if args.dry_run:
        print("--dry-run: DB에 쓰지 않았습니다.")
        return

    for tier, chosen in built:
        # 같은 이름의 템플릿이 있으면 갈아끼운다 (재실행 안전)
        existing = api(url, key, f"quote_templates?name=eq.{urllib.parse.quote(tier['name'])}&select=id")
        for row in existing or []:
            api(url, key, f"quote_templates?id=eq.{row['id']}", method="DELETE", prefer="return=minimal")

        created = api(
            url, key, "quote_templates",
            method="POST",
            body={
                "name": tier["name"],
                "description": tier["description"],
                "platform": PLATFORM,
                "sort_order": tier["sort_order"],
            },
            prefer="return=representation",
        )
        tid = created[0]["id"]
        api(
            url, key, "quote_template_items",
            method="POST",
            body=[
                {"template_id": tid, "category": cat, "part_id": p["id"], "quantity": 1}
                for cat, p in chosen.items()
            ],
            prefer="return=minimal",
        )
        print(f"저장: {tier['name']} ({len(chosen)}개 품목)")


if __name__ == "__main__":
    import urllib.parse  # noqa: E402  (main에서만 쓴다)
    main()
