import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/lib/auth-context";
import { ModeProvider } from "@/lib/mode-context";
import { Toaster } from "@/components/ui/sonner";

const noto = Noto_Sans_KR({
  variable: "--font-noto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://woojudealer.vercel.app"
  ),
  title: "우주딜러 — B2B 폐PC 원스톱 플랫폼",
  description:
    "수거에서 보안삭제 인증서까지, 기업의 폐PC를 안전하게 가치화하는 B2B 원스톱 플랫폼",
  openGraph: {
    title: "우주딜러",
    description:
      "B2B 폐PC 수거 → 보안삭제(DoD 5220.22-M) → 인증서 원스톱 플랫폼",
    siteName: "우주딜러",
    images: [{ url: "/wooju/og.png", width: 1200, height: 630 }],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "우주딜러",
    description:
      "B2B 폐PC 수거 → 보안삭제(DoD 5220.22-M) → 인증서 원스톱 플랫폼",
    images: ["/wooju/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${noto.variable} antialiased dark`}>
      <head>
        <link rel="preload" href="/wooju/fonts/SDSwaggerTTF.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        {/*
          비밀번호 재설정 메일의 복구 토큰(#type=recovery)은 우리가 지정한
          redirectTo가 아니라 Supabase의 Site URL(= 홈)로 떨어지는 경우가 있다.
          그러면 홈만 뜨고 끝나 새 비밀번호를 세울 방법이 없다.

          이 검사를 React 쪽에 두면 늦는다 — 랜딩이 부품 목록을 부르며 Supabase
          클라이언트를 만드는 순간 detectSessionInUrl이 해시를 먹어치워, 재설정
          화면으로 넘어가도 토큰이 남아있지 않다. head의 인라인 스크립트는 모듈이
          로드되기 전에 실행되므로 그보다 먼저 가로챈다.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var h=location.hash;if(h.indexOf('type=recovery')>-1&&location.pathname!=='/auth/reset'){location.replace('/auth/reset'+h);}}catch(e){}})();",
          }}
        />
      </head>
      <body className="min-h-screen">
        <AuthProvider>
          <ModeProvider>{children}</ModeProvider>
        </AuthProvider>
        <Toaster richColors closeButton theme="dark" />
      </body>
    </html>
  );
}
