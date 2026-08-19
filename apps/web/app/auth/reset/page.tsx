"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MIN_LENGTH = 8;

type Phase = "checking" | "ready" | "expired";

/**
 * 비밀번호 재설정 — 메일 링크가 도착하는 화면.
 *
 * Supabase는 링크 방식에 따라 복구 토큰을 두 가지로 넘긴다.
 *  - PKCE:  ?code=... → exchangeCodeForSession으로 세션을 만든다
 *  - implicit: #access_token=...&type=recovery → createBrowserClient가
 *              detectSessionInUrl로 알아서 흡수한다 (getSession이 그 초기화를 기다린다)
 * 둘 다 받아야 한다. 대시보드에서 보낸 메일과 앱에서 보낸 메일의 형식이 다르다.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function init() {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
      // 만료·재사용된 링크는 error_description을 달고 돌아온다.
      if (url.searchParams.get("error_description") || hash.get("error_description")) {
        if (active) setPhase("expired");
        return;
      }

      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          if (active) setPhase("expired");
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (active) setPhase(session ? "ready" : "expired");
    }

    init();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < MIN_LENGTH) {
      toast.error(`비밀번호는 ${MIN_LENGTH}자 이상이어야 합니다`);
      return;
    }
    if (password !== confirm) {
      toast.error("비밀번호가 서로 다릅니다");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("비밀번호를 변경했습니다");
      // 복구 링크로 이미 로그인된 상태다. 서버 컴포넌트가 새 세션을 보도록
      // refresh를 먼저 태우고 이동한다.
      router.refresh();
      router.push("/requests");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(
        msg.includes("New password should be different")
          ? "이전과 다른 비밀번호를 입력해주세요"
          : "비밀번호를 변경하지 못했습니다. 링크를 다시 요청해주세요"
      );
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
        {phase === "checking" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm text-text-secondary">링크를 확인하고 있습니다…</p>
          </div>
        )}

        {phase === "expired" && (
          <div className="text-center">
            <h1 className="mb-2 text-xl font-extrabold text-foreground">
              링크가 만료되었습니다
            </h1>
            <p className="mb-6 text-sm leading-relaxed text-text-secondary">
              재설정 링크는 한 번만, 정해진 시간 안에만 쓸 수 있습니다.
              다시 요청해주세요.
            </p>
            <Button asChild variant="cta" size="lg" className="w-full">
              <Link href="/forgot-password">재설정 링크 다시 받기</Link>
            </Button>
          </div>
        )}

        {phase === "ready" && (
          <>
            <div className="mb-6 text-center">
              <h1 className="mb-1 text-2xl font-extrabold text-foreground">
                새 비밀번호 설정
              </h1>
              <p className="text-sm text-text-secondary">
                {MIN_LENGTH}자 이상으로 정해주세요
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">새 비밀번호</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    placeholder="새 비밀번호"
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

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirm">새 비밀번호 확인</Label>
                <Input
                  id="confirm"
                  type={showPw ? "text" : "password"}
                  placeholder="한 번 더 입력"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
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
                비밀번호 변경
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
