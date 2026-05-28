"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { Provider } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

function GoogleIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

const SOCIALS: {
  provider: Provider;
  label: string;
  className: string;
  icon?: React.ReactNode;
}[] = [
  {
    provider: "google",
    label: "Google로 계속하기",
    className: "border-[1.5px] border-border bg-white text-foreground hover:bg-secondary",
    icon: <GoogleIcon />,
  },
  {
    provider: "kakao",
    label: "카카오로 계속하기",
    className: "bg-[#FEE500] text-[#191600] hover:brightness-95",
    icon: (
      <svg className="size-5" viewBox="0 0 24 24" fill="#191600">
        <path d="M12 3C6.48 3 2 6.58 2 11c0 2.86 1.93 5.36 4.83 6.77-.21.78-.77 2.83-.88 3.27-.14.55.2.54.43.39.18-.12 2.82-1.92 3.96-2.7.54.08 1.1.12 1.66.12 5.52 0 10-3.58 10-8S17.52 3 12 3Z" />
      </svg>
    ),
  },
  {
    provider: "naver",
    label: "네이버로 계속하기",
    className: "bg-[#03C75A] text-white hover:brightness-95",
    icon: (
      <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.27 12.84 7.5 0H0v24h7.73V11.16L16.5 24H24V0h-7.73v12.84Z" />
      </svg>
    ),
  },
];

function LoginInner() {
  const { login, loginAsAdmin } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = params.get("return_to") || "/requests";

  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState<Provider | null>(null);

  function handleSocial(provider: Provider) {
    if (!agreed) {
      toast.error("이용약관 및 개인정보처리방침에 동의해주세요");
      return;
    }
    setLoading(provider);
    setTimeout(() => {
      login(provider);
      toast.success("로그인되었습니다");
      router.push(returnTo);
    }, 600);
  }

  function handleAdmin() {
    setLoading("admin");
    setTimeout(() => {
      loginAsAdmin();
      toast.success("운영자로 로그인했습니다");
      router.push("/admin");
    }, 600);
  }

  const busy = loading !== null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[linear-gradient(135deg,#EFF6FF_0%,#F8FAFC_60%,#FFF7ED_100%)] px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-base font-extrabold text-white">
          W
        </span>
        <span className="text-xl font-bold text-primary">우주딜러</span>
      </Link>

      <div className="w-full max-w-[420px] rounded-2xl border border-border bg-card p-8 shadow-lg">
        <div className="mb-7 text-center">
          <h1 className="mb-1.5 text-2xl font-extrabold text-foreground">로그인</h1>
          <p className="text-sm text-text-secondary">
            소셜 계정으로 간편하게 시작하세요
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          {SOCIALS.map((s) => (
            <button
              key={s.provider}
              type="button"
              disabled={busy}
              onClick={() => handleSocial(s.provider)}
              className={`flex h-[52px] w-full cursor-pointer items-center justify-center gap-3 rounded-xl text-[15px] font-semibold transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 ${s.className}`}
            >
              {loading === s.provider ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                s.icon
              )}
              {s.label}
            </button>
          ))}
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-2.5 rounded-lg bg-secondary p-3.5">
          <Checkbox
            checked={agreed}
            onCheckedChange={(v) => setAgreed(v === true)}
            className="mt-0.5"
            disabled={busy}
          />
          <span className="text-[13px] leading-relaxed text-text-secondary">
            <Link href="/support#terms" className="font-semibold text-primary hover:underline">
              이용약관
            </Link>{" "}
            및{" "}
            <Link href="/support#privacy" className="font-semibold text-primary hover:underline">
              개인정보처리방침
            </Link>
            에 동의합니다 (필수)
          </span>
        </label>

        <div className="my-6 flex items-center gap-3 text-xs text-text-muted">
          <span className="h-px flex-1 bg-border" />
          또는
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleAdmin}
          disabled={busy}
        >
          {loading === "admin" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ShieldCheck className="size-4" />
          )}
          운영자 데모 로그인
        </Button>
      </div>

      <p className="mt-6 text-xs text-text-muted">
        데모 환경입니다. 실제 소셜 인증 없이 체험용 계정으로 로그인됩니다.
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
