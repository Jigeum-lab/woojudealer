#!/usr/bin/env python3
"""
기존 우주딜러(Firebase) 부품 사진을 parts.image_url에 연결한다.

사진은 PartsImages/{분류}/{고유번호}.{확장자} 로 올라가 있고, 확장자가
png/jpg/JPG로 섞여 있다. 클라이언트가 확장자를 추측하면 404가 계속 나므로
버킷을 한 번 훑어 정확한 URL을 DB에 박아둔다.

사용법:
  python3 scripts/link_part_images.py            # 실제 반영
  python3 scripts/link_part_images.py --dry-run  # 매칭 결과만 출력
"""

import argparse
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = REPO_ROOT / "apps" / "web" / ".env.local"

BUCKET = "woojudealer-402eb.appspot.com"
FIREBASE = f"https://firebasestorage.googleapis.com/v0/b/{BUCKET}/o"

# 엑셀/DB 카테고리(enum) → Firebase 폴더명.
# cpu·mainboard는 플랫폼에 따라 폴더가 갈린다(고유번호 대역으로 구분).
FOLDER_BY_CATEGORY = {
    "case": ["케이스"],
    "case_fan": ["케이스팬"],
    "cpu": ["AMD", "Intel"],
    "cpu_cooler": ["CPU쿨러"],
    "extra": ["추가품목"],
    "gpu": ["그래픽카드"],
    "hdd": ["HDD"],
    "headset": ["헤드셋"],
    "keyboard": ["키보드"],
    "labor_as": ["공임"],
    "mainboard": ["AMD마더보드", "Intel마더보드"],
    "memory": ["메모리"],
    "memory_heatsink": ["메모리방열판"],
    "monitor": ["모니터"],
    "mouse": ["마우스"],
    "psu": ["파워"],
    "rgb_controller": ["RGB컨트롤러"],
    "speaker": ["스피커"],
    "ssd": ["SSD"],
    "ssd_heatsink": ["SSD방열판"],
    "tuning": ["튜닝"],
}


def read_env() -> dict:
    if not ENV_FILE.exists():
        sys.exit(f"{ENV_FILE}가 없습니다")
    env = {}
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()
    return env


def list_bucket() -> dict[tuple[str, int], str]:
    """(폴더, 고유번호) → 공개 URL"""
    found: dict[tuple[str, int], str] = {}
    token = None
    pattern = re.compile(r"^PartsImages/([^/]+)/(\d+)\.(png|jpg|jpeg|JPG|JPEG|PNG|webp)$")

    while True:
        url = f"{FIREBASE}?prefix=PartsImages%2F&maxResults=1000"
        if token:
            url += f"&pageToken={urllib.parse.quote(token)}"
        with urllib.request.urlopen(url, timeout=60) as r:
            page = json.load(r)

        for item in page.get("items", []):
            m = pattern.match(item["name"])
            if not m:
                continue
            folder, no = m.group(1), int(m.group(2))
            encoded = urllib.parse.quote(item["name"], safe="")
            # 같은 번호로 여러 확장자가 있으면 먼저 만난 것을 쓴다
            found.setdefault((folder, no), f"{FIREBASE}/{encoded}?alt=media")

        token = page.get("nextPageToken")
        if not token:
            break

    return found


def fetch_parts(env: dict) -> list[dict]:
    url = env["NEXT_PUBLIC_SUPABASE_URL"] + "/rest/v1/parts?select=id,part_no,category&limit=2000"
    req = urllib.request.Request(
        url,
        headers={
            "apikey": env["SUPABASE_SERVICE_ROLE_KEY"],
            "Authorization": "Bearer " + env["SUPABASE_SERVICE_ROLE_KEY"],
        },
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def patch(env: dict, part_id: str, image_url: str) -> None:
    url = env["NEXT_PUBLIC_SUPABASE_URL"] + f"/rest/v1/parts?id=eq.{part_id}"
    body = json.dumps({"image_url": image_url}).encode()
    req = urllib.request.Request(
        url,
        data=body,
        method="PATCH",
        headers={
            "apikey": env["SUPABASE_SERVICE_ROLE_KEY"],
            "Authorization": "Bearer " + env["SUPABASE_SERVICE_ROLE_KEY"],
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
    )
    urllib.request.urlopen(req, timeout=30).read()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    env = read_env()
    print("버킷 목록 조회 중…")
    images = list_bucket()
    print(f"  사진 {len(images)}장")

    parts = fetch_parts(env)
    print(f"  DB 부품 {len(parts)}개")

    matched, missing = [], defaultdict(int)
    for p in parts:
        no = p.get("part_no")
        if no is None:
            continue
        url = None
        for folder in FOLDER_BY_CATEGORY.get(p["category"], []):
            url = images.get((folder, no))
            if url:
                break
        if url:
            matched.append((p["id"], url))
        else:
            missing[p["category"]] += 1

    print(f"\n매칭 {len(matched)} / {len(parts)} ({len(matched) * 100 // max(len(parts), 1)}%)")
    if missing:
        print("사진 없는 부품:")
        for cat, n in sorted(missing.items(), key=lambda x: -x[1]):
            print(f"  {cat:16s} {n}")

    if args.dry_run:
        print("\n--dry-run 이라 반영하지 않았습니다.")
        return

    print("\n반영 중…")
    for i, (part_id, url) in enumerate(matched, 1):
        patch(env, part_id, url)
        if i % 100 == 0:
            print(f"  {i}/{len(matched)}")
    print(f"완료: {len(matched)}건")


if __name__ == "__main__":
    main()
