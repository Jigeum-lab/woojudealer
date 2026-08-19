"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { useAuth, type OAuthProvider } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.29a7.21 7.21 0 0 1 0-4.58V6.62H1.27a12 12 0 0 0 0 10.76l4.01-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.59 1.79l3.44-3.44C17.95 1.19 15.23 0 12 0A12 12 0 0 0 1.27 6.62l4.01 3.09C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

function KakaoMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#181600"
        d="M12 3C6.98 3 2.9 6.2 2.9 10.15c0 2.52 1.68 4.73 4.2 5.99l-1.06 3.9c-.09.34.28.61.58.42l4.63-3.06c.25.02.5.03.75.03 5.02 0 9.1-3.2 9.1-7.28S17.02 3 12 3Z"
      />
    </svg>
  );
}

/**
 * 소셜 로그인 버튼.
 *
 * provider마다 플래그로 따로 켠다 — Supabase에서 켜지 않은 provider를 누르면
 * "provider is not enabled"로 실패하기 때문에, 키를 넣은 것만 노출한다.
 *   NEXT_PUBLIC_GOOGLE_LOGIN=1 → 구글
 *   NEXT_PUBLIC_KAKAO_LOGIN=1  → 카카오
 * (네이버는 Supabase 네이티브 provider가 아니라 커스텀 OIDC 설정이 더 필요하다.)
 *
 * 약관 동의(agreed)는 이메일 폼과 동일하게 필수 — OAuth 진입 전에 검사한다.
 */
export function SocialLogin({ next, agreed }: { next: string; agreed: boolean }) {
  const { signInWithProvider } = useAuth();
  const [busy, setBusy] = useState<OAuthProvider | null>(null);

  const googleOn = process.env.NEXT_PUBLIC_GOOGLE_LOGIN === "1";
  const kakaoOn = process.env.NEXT_PUBLIC_KAKAO_LOGIN === "1";
  if (!googleOn && !kakaoOn) return null;

  async function start(provider: OAuthProvider) {
    if (!agreed) {
      toast.error("이용약관에 동의해주세요");
      return;
    }
    setBusy(provider);
    try {
      await signInWithProvider(provider, next);
      // 성공 시 provider로 리다이렉트되므로 busy 해제 불필요
    } catch {
      toast.error(
        `${provider === "google" ? "Google" : "카카오"} 로그인을 시작하지 못했습니다. 다시 시도해주세요`
      );
      setBusy(null);
    }
  }

  return (
    <div className="mt-5">
      <div className="mb-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-text-muted">또는</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="flex flex-col gap-2.5">
        {googleOn && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => start("google")}
            disabled={busy !== null}
            className="w-full gap-2.5"
          >
            {busy === "google" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <GoogleMark />
            )}
            Google로 계속하기
          </Button>
        )}

        {kakaoOn && (
          <Button
            type="button"
            size="lg"
            onClick={() => start("kakao")}
            disabled={busy !== null}
            className="w-full gap-2.5 border border-[#FEE500] bg-[#FEE500] text-[#181600] hover:bg-[#f2da00]"
          >
            {busy === "kakao" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <KakaoMark />
            )}
            카카오로 계속하기
          </Button>
        )}
      </div>
    </div>
  );
}
