"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

function SignupInner() {
  const { signUp } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = params.get("return_to") || "/me";

  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [agreed, setAgreed] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) { toast.error("이용약관에 동의해주세요"); return; }
    if (form.password !== form.confirm) { toast.error("비밀번호가 일치하지 않습니다"); return; }
    if (form.password.length < 8) { toast.error("비밀번호는 8자 이상이어야 합니다"); return; }

    setLoading(true);
    try {
      await signUp(form.email, form.password, form.name);
      toast.success("가입이 완료됐습니다! 이메일 인증 후 로그인해주세요.");
      router.push(`/login?return_to=${encodeURIComponent(returnTo)}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "회원가입 실패";
      toast.error(msg.includes("already") ? "이미 가입된 이메일입니다" : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      {/* Logo */}
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <span
          className="text-xl font-black text-primary"
          style={{ fontFamily: "SDSwagger" }}
        >
          우주딜러
        </span>
      </Link>

      <div className="w-full max-w-[420px] rounded-2xl border border-border bg-card p-8">
        <div className="mb-7 text-center">
          <h1 className="mb-1.5 text-2xl font-extrabold text-foreground">회원가입</h1>
          <p className="text-sm text-text-secondary">B2B 폐PC 업사이클링 플랫폼</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name" className="text-sm font-medium">담당자 이름</Label>
            <Input
              id="name"
              placeholder="홍길동"
              value={form.name}
              onChange={set("name")}
              required
              disabled={loading}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" className="text-sm font-medium">이메일</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={set("email")}
              required
              disabled={loading}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password" className="text-sm font-medium">비밀번호</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPw ? "text" : "password"}
                placeholder="8자 이상"
                value={form.password}
                onChange={set("password")}
                required
                disabled={loading}
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm" className="text-sm font-medium">비밀번호 확인</Label>
            <Input
              id="confirm"
              type="password"
              placeholder="비밀번호 재입력"
              value={form.confirm}
              onChange={set("confirm")}
              required
              disabled={loading}
            />
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg bg-secondary p-3">
            <Checkbox
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
              disabled={loading}
              className="mt-0.5"
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

          <Button variant="cta" size="lg" type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 className="size-4 animate-spin" />}
            가입하기
          </Button>
        </form>

        <p className="mt-5 text-center text-[13px] text-text-muted">
          이미 계정이 있나요?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupInner />
    </Suspense>
  );
}
