import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/lib/auth-context";
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
    images: [{ url: "/wooju/og.png", width: 720, height: 720 }],
    locale: "ko_KR",
    type: "website",
  },
  icons: { icon: "/wooju/logo.svg" },
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
      </head>
      <body className="min-h-screen">
        <AuthProvider>{children}</AuthProvider>
        <Toaster richColors closeButton theme="dark" />
      </body>
    </html>
  );
}
