"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

/** 약관 동의 체크박스 — 눈에 잘 띄도록 강조 (테두리·크기 up) */
function ConsentCheckbox({
  agreed,
  onChange,
  disabled,
}: {
  agreed: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border-2 border-border-strong bg-secondary p-3.5 transition-colors has-[button[data-state=checked]]:border-primary has-[button[data-state=checked]]:bg-brand-green-soft">
      <Checkbox
        checked={agreed}
        onCheckedChange={(v) => onChange(v === true)}
        disabled={disabled}
        className="mt-0.5 size-5 border-2 border-text-secondary data-[state=checked]:border-primary"
      />
      <span className="text-[13px] leading-relaxed text-text-secondary">
        <Link href="/support#terms" className="font-semibold text-primary hover:underline">이용약관</Link>{" "}
        및{" "}
        <Link href="/support#privacy" className="font-semibold text-primary hover:underline">개인정보처리방침</Link>에 동의합니다 <span className="font-semibold text-foreground">(필수)</span>
      </span>
    </label>
  );
}

function LoginInner() {
  const { signIn } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = params.get("return_to") || "/requests";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) { toast.error("이용약관에 동의해주세요"); return; }
    setBusy(true);
    try {
      await signIn(email, password);
      toast.success("로그인되었습니다");
      router.push(returnTo);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "로그인 실패";
      toast.error(
        msg.includes("Invalid") || msg.includes("credentials")
          ? "이메일 또는 비밀번호가 올바르지 않습니다"
          : msg
      );
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <Link href="/" className="mb-8">
        <span
          className="text-2xl font-black text-primary"
          style={{ fontFamily: "SDSwagger" }}
        >
          우주딜러
        </span>
      </Link>

      <div className="w-full max-w-[420px] rounded-2xl border border-border bg-card p-8">
        <div className="mb-6 text-center">
          <h1 className="mb-1 text-2xl font-extrabold text-foreground">로그인</h1>
          <p className="text-sm text-text-secondary">B2B 폐PC 업사이클링 플랫폼</p>
        </div>

        <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={busy}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">비밀번호</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPw ? "text" : "password"}
                placeholder="비밀번호 입력"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={busy}
                className="pr-10"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
              >
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <ConsentCheckbox agreed={agreed} onChange={setAgreed} disabled={busy} />

          <Button variant="cta" size="lg" type="submit" disabled={busy} className="w-full">
            {busy && <Loader2 className="size-4 animate-spin" />}
            로그인
          </Button>
        </form>

        <p className="mt-4 text-center text-[13px] text-text-muted">
          계정이 없나요?{" "}
          <Link
            href={`/signup?return_to=${encodeURIComponent(returnTo)}`}
            className="font-semibold text-primary hover:underline"
          >
            회원가입
          </Link>
        </p>
      </div>
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
