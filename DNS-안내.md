# woojudealer.com DNS 안내 (클라이언트 발송용)

아래 블록을 통째로 복사해서 보내면 된다.

```
[woojudealer.com DNS 설정 요청]

새 우주딜러 플랫폼(Vercel)으로 도메인을 연결하기 위한 DNS 설정 요청입니다.
네임서버는 가비아 그대로 두시면 됩니다. (변경 불필요)

■ 설정 위치
My가비아 → 서비스관리 → 도메인 → woojudealer.com → DNS 정보 → DNS 관리 툴


■ 1단계 — 관리자 주소 (먼저 요청드립니다)

  [추가]
  타입    : CNAME
  호스트  : admin
  값/위치 : cname.vercel-dns.com.
  TTL     : 3600

  ※ 값 끝의 마침표(.)까지 그대로 입력해 주세요.
    가비아는 마침표가 없으면 뒤에 도메인이 덧붙습니다.

  이 레코드는 기존 홈페이지에 영향을 주지 않습니다.
  적용 확인 후 2단계를 진행합니다.


■ 2단계 — 홈페이지 주소 (1단계 확인 후)

  [추가]
  타입    : CNAME
  호스트  : www
  값/위치 : cname.vercel-dns.com.
  TTL     : 3600

  [수정] 기존 A 레코드(현재 값 199.36.158.100)를 아래로 변경
  타입    : A
  호스트  : @
  값/위치 : 76.76.21.21
  TTL     : 3600

  이 단계에서 woojudealer.com 접속이 새 플랫폼으로 전환됩니다.


■ 삭제하면 안 되는 레코드

  아래 두 가지는 회사 메일과 구글 인증에 사용 중입니다. 건드리지 말아 주세요.

  - MX 레코드  : smtp.google.com (Google Workspace 메일)
  - TXT 레코드 : google-site-verification=... (구글 소유 확인)


■ 적용 시간

  보통 10분~1시간, 최대 24시간까지 걸릴 수 있습니다.
  설정 완료하시면 알려주세요. 저희 쪽에서 연결 상태와
  HTTPS 인증서 자동 발급까지 확인하겠습니다.
```

---

## 우리 쪽 작업

- [x] Vercel 프로젝트에 도메인 연결 — `woojudealer.com`, `www.woojudealer.com`, `admin.woojudealer.com` 3개 모두 `woojudealer` 프로젝트에 붙음 (DNS 대기 중)

DNS 붙은 뒤:

- [ ] env `NEXT_PUBLIC_ADMIN_HOST=admin.woojudealer.com` 추가
- [ ] env `NEXT_PUBLIC_SITE_URL` 값 확인 후 `https://woojudealer.com`로 갱신 (sensitive 처리돼 있어 현재 값 조회 불가)
- [ ] 재배포 (env는 빌드 타임에 박히므로 배포해야 적용)

`NEXT_PUBLIC_ADMIN_HOST`는 DNS가 붙은 **뒤에** 채운다. 미리 넣으면 `/admin` 접근이 아직 없는 호스트로 튕겨 운영이 끊긴다.
