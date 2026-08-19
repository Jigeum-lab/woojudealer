# woojudealer.com DNS 설정값

가비아 DNS 관리툴에 넣을 레코드. 네임서버는 가비아 그대로 두고 레코드만 넣는다.

## 추가·수정할 레코드

| # | 타입 | 호스트 | 값/위치 | TTL | 비고 |
|---|---|---|---|---|---|
| 1 | A | `@` | `216.150.1.1` | 3600 | 기존 값 `199.36.158.100` 수정 |
| 2 | A | `@` | `216.150.16.1` | 3600 | 새로 추가 (이중화) |
| 3 | CNAME | `www` | `9f7e0ee289c07037.vercel-dns-017.com.` | 3600 | 새로 추가 |
| 4 | CNAME | `admin` | `9f7e0ee289c07037.vercel-dns-017.com.` | 3600 | 새로 추가 |

- CNAME 값 끝의 **마침표(.)까지** 그대로. 없으면 가비아가 뒤에 도메인을 한 번 더 붙인다.
- 3번·4번 값은 **같다.** 프로젝트 단위 주소라 그렇다.
- 1번을 바꾸는 순간 `woojudealer.com`이 새 플랫폼으로 전환된다. 지금 뜨는 옛 사이트는 사라진다.

## 건드리면 안 되는 레코드

| 타입 | 값 | 용도 |
|---|---|---|
| MX | `smtp.google.com` | Google Workspace 회사 메일 |
| TXT | `google-site-verification=...` | 구글 소유 확인 |

## 클라이언트 발송용

```
[woojudealer.com DNS 설정 요청]

My가비아 → 서비스관리 → 도메인 → woojudealer.com → DNS 정보 → DNS 관리 툴
에서 아래 레코드를 설정 부탁드립니다. 네임서버는 변경 불필요합니다.

[수정] 기존 A 레코드 (현재 값 199.36.158.100)
  타입: A       호스트: @       값: 216.150.1.1      TTL: 3600

[추가]
  타입: A       호스트: @       값: 216.150.16.1     TTL: 3600
  타입: CNAME   호스트: www     값: 9f7e0ee289c07037.vercel-dns-017.com.   TTL: 3600
  타입: CNAME   호스트: admin   값: 9f7e0ee289c07037.vercel-dns-017.com.   TTL: 3600

※ CNAME 값 끝의 마침표(.)까지 그대로 입력해 주세요.
※ www와 admin의 값은 동일합니다. 오타가 아닙니다.
※ MX(smtp.google.com)와 google-site-verification TXT 레코드는
   회사 메일·구글 인증에 사용 중이니 삭제하지 말아 주세요.
※ A 레코드를 바꾸시면 woojudealer.com이 새 플랫폼으로 전환됩니다.

적용까지 보통 10분~1시간, 최대 24시간 걸립니다.
완료되면 알려주세요. 연결 상태와 HTTPS 인증서 발급까지 확인하겠습니다.
```

## 값 출처

Vercel API가 rank 1로 주는 현재 권장값이다. `cname.vercel-dns.com` / `76.76.21.21`은
rank 2(legacy)로 동작은 하지만 권장값이 아니다. CLI `vercel domains inspect`는 legacy를
안내하므로 그대로 믿지 말 것.

```
curl -s "https://api.vercel.com/v6/domains/woojudealer.com/config?teamId=team_zfXYXBCOco8Ts018upMR4OFf" \
  -H "Authorization: Bearer $VERCEL_TOKEN"
```

## 우리 쪽 작업

- [x] Vercel 프로젝트에 도메인 3개 연결 (`woojudealer.com`, `www`, `admin`) — DNS 대기 중
- [x] 호스트 기반 어드민 라우팅 (`proxy.ts`)

DNS 붙은 뒤:

- [ ] env `NEXT_PUBLIC_ADMIN_HOST=admin.woojudealer.com`
- [ ] env `NEXT_PUBLIC_SITE_URL=https://woojudealer.com` (OG 이미지·인증서 QR이 이 값을 탄다)
- [ ] 재배포 (env는 빌드 타임에 박힌다)
- [ ] Supabase → Authentication → URL Configuration
      - Site URL `https://woojudealer.com`
      - Redirect URLs `https://woojudealer.com/auth/reset`, `/auth/callback`,
        `https://admin.woojudealer.com/auth/callback`

`NEXT_PUBLIC_ADMIN_HOST`는 DNS가 붙은 **뒤에** 채운다. 미리 넣으면 고객 호스트의
`/admin`이 404가 되는데 admin 호스트는 아직 안 떠서 운영 화면에 들어갈 길이 없어진다.
