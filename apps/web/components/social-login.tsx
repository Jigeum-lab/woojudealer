"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
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

/**
 * 구분선 + Google 로그인 버튼.
 * 약관 동의(agreed)는 이메일 폼과 동일하게 필수 — OAuth 진입 전에 검사한다.
 *
 * Supabase에서 Google provider를 켜기 전까지는 버튼을 노출하지 않는다.
 * 꺼진 상태로 누르면 "provider is not enabled"로 실패하기 때문이다.
 * 구글 OAuth 키를 등록한 뒤 NEXT_PUBLIC_GOOGLE_LOGIN=1 을 넣으면 켜진다.
 */
export function SocialLogin({ next, agreed }: { next: string; agreed: boolean }) {
  const { signInWithProvider } = useAuth();
  const [busy, setBusy] = useState(false);

  if (process.env.NEXT_PUBLIC_GOOGLE_LOGIN !== "1") return null;

  async function handleGoogle() {
    if (!agreed) {
      toast.error("이용약관에 동의해주세요");
      return;
    }
    setBusy(true);
    try {
      await signInWithProvider("google", next);
      // 성공 시 구글로 리다이렉트되므로 busy 해제 불필요
    } catch {
      toast.error("Google 로그인을 시작하지 못했습니다. 다시 시도해주세요");
      setBusy(false);
    }
  }

  return (
    <div className="mt-5">
      <div className="mb-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-text-muted">또는</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={handleGoogle}
        disabled={busy}
        className="w-full gap-2.5"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <GoogleMark />}
        Google로 계속하기
      </Button>
    </div>
  );
}
