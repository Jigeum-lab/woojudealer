"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * 비밀번호 재설정 요청.
 *
 * redirectTo를 /auth/reset으로 못박는다. 이걸 비워두면 Supabase가 Site URL
 * (현재 woojudealer.vercel.app)로 보내는데, 그쪽엔 복구 토큰을 받아 처리할
 * 화면이 없어서 그냥 메인페이지가 뜬다 — 실제로 그렇게 새고 있었다.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset`,
      });
      if (error) throw error;
      // 가입 여부와 무관하게 같은 화면을 보여준다 — 계정 존재 여부가 새지 않게.
      setSent(true);
    } catch {
      toast.error("메일을 보내지 못했습니다. 잠시 후 다시 시도해주세요");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <Link href="/" className="mb-8">
        <span
          className="text-2xl font-black text-white"
          style={{ fontFamily: "SDSwagger" }}
        >
          우주딜러
        </span>
      </Link>

      <div className="w-full max-w-[420px] rounded-2xl border border-border bg-card p-8">
        {sent ? (
          <div className="text-center">
            <MailCheck className="mx-auto mb-4 size-10 text-primary" />
            <h1 className="mb-2 text-xl font-extrabold text-foreground">
              메일을 보냈습니다
            </h1>
            <p className="mb-6 text-sm leading-relaxed text-text-secondary">
              <span className="font-semibold text-foreground">{email}</span> 으로
              재설정 링크를 보냈습니다. 메일함에 없으면 스팸함도 확인해주세요.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">로그인으로 돌아가기</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-6 text-center">
              <h1 className="mb-1 text-2xl font-extrabold text-foreground">
                비밀번호 재설정
              </h1>
              <p className="text-sm text-text-secondary">
                가입하신 이메일로 재설정 링크를 보내드립니다
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

              <Button
                variant="cta"
                size="lg"
                type="submit"
                disabled={busy}
                className="w-full"
              >
                {busy && <Loader2 className="size-4 animate-spin" />}
                재설정 링크 보내기
              </Button>
            </form>

            <p className="mt-4 text-center text-[13px] text-text-muted">
              비밀번호가 기억나셨나요?{" "}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                로그인
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
