#!/usr/bin/env python3
"""
부품 사진을 기존 Firebase에서 내려받아 줄인 뒤 저장소에 넣는다.

왜 옮기나:
  - 원본이 장당 194KB(합계 112MB)인데 화면에서는 44~56px 썸네일로 쓴다.
    200px JPEG로 줄이면 1/10이 된다.
  - 옛 Firebase 프로젝트를 정리하면 핫링크가 전부 깨진다. 정적 파일로 들고 있으면
    그 걱정이 없고 Vercel이 그냥 서빙하므로 추가 비용도 없다.
  - 표본 확인 결과 투명배경을 쓰는 이미지가 없어 JPEG로 바꿔도 손실이 없다.

결과: apps/web/public/wooju/parts/{고유번호}.jpg
      parts.image_url 을 /wooju/parts/{고유번호}.jpg 로 바꾼다.

사용법:
  python3 scripts/localize_part_images.py [--limit N]
"""

import argparse
import json
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = REPO_ROOT / "apps" / "web" / ".env.local"
OUT_DIR = REPO_ROOT / "apps" / "web" / "public" / "wooju" / "parts"
PUBLIC_PREFIX = "/wooju/parts"

MAX_EDGE = 200      # 화면 최대 사용 크기(56px)의 여유분 — 레티나 2배 + 여유
JPEG_QUALITY = 72


def read_env() -> dict:
    if not ENV_FILE.exists():
        sys.exit(f"{ENV_FILE}가 없습니다")
    env = {}
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


def api(env: dict, path: str, method: str = "GET", body=None):
    url = env["NEXT_PUBLIC_SUPABASE_URL"] + path
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "apikey": env["SUPABASE_SERVICE_ROLE_KEY"],
            "Authorization": "Bearer " + env["SUPABASE_SERVICE_ROLE_KEY"],
            "Content-Type": "application/json",
            "Prefer": "return=minimal" if method != "GET" else "",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read()
        return json.loads(raw) if raw and method == "GET" else None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="테스트용으로 N개만")
    args = ap.parse_args()

    env = read_env()
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    parts = api(
        env,
        "/rest/v1/parts?select=id,part_no,image_url&image_url=not.is.null&limit=2000",
    )
    # 이미 로컬 경로로 바꾼 건 건너뛴다 (재실행 안전)
    todo = [p for p in parts if p["image_url"].startswith("http") and p.get("part_no")]
    if args.limit:
        todo = todo[: args.limit]

    print(f"대상 {len(todo)}장 (전체 image_url {len(parts)}건)")
    ok = fail = 0
    saved_bytes = 0

    with tempfile.TemporaryDirectory() as tmp:
        for i, p in enumerate(todo, 1):
            no = p["part_no"]
            src = Path(tmp) / f"{no}.orig"
            dst = OUT_DIR / f"{no}.jpg"
            try:
                with urllib.request.urlopen(p["image_url"], timeout=30) as r:
                    blob = r.read()
                src.write_bytes(blob)

                subprocess.run(
                    ["sips", "-s", "format", "jpeg",
                     "-s", "formatOptions", str(JPEG_QUALITY),
                     "-Z", str(MAX_EDGE),
                     str(src), "--out", str(dst)],
                    check=True, capture_output=True,
                )
                saved_bytes += len(blob) - dst.stat().st_size

                api(env, f"/rest/v1/parts?id=eq.{p['id']}", "PATCH",
                    {"image_url": f"{PUBLIC_PREFIX}/{no}.jpg"})
                ok += 1
            except (urllib.error.HTTPError, urllib.error.URLError,
                    subprocess.CalledProcessError, OSError) as e:
                fail += 1
                print(f"  실패 {no}: {type(e).__name__}")
            if i % 50 == 0:
                print(f"  {i}/{len(todo)}")

    total = sum(f.stat().st_size for f in OUT_DIR.glob("*.jpg"))
    print(f"\n완료: {ok}장 · 실패 {fail}장")
    print(f"저장소 용량: {total/1024/1024:.1f} MB (절감 {saved_bytes/1024/1024:.1f} MB)")


if __name__ == "__main__":
    main()
