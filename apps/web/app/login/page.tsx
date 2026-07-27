"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import type { Provider } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

function GoogleIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

const SOCIALS: { provider: Provider; label: string; className: string; icon: React.ReactNode }[] = [
  {
    provider: "google",
    label: "Google로 계속하기",
    className: "border border-border bg-card text-foreground",
    icon: <GoogleIcon />,
  },
  {
    provider: "kakao",
    label: "카카오로 계속하기",
    className: "bg-[#FEE500] text-[#191600]",
    icon: (
      <svg className="size-5" viewBox="0 0 24 24" fill="#191600">
        <path d="M12 3C6.48 3 2 6.58 2 11c0 2.86 1.93 5.36 4.83 6.77-.21.78-.77 2.83-.88 3.27-.14.55.2.54.43.39.18-.12 2.82-1.92 3.96-2.7.54.08 1.1.12 1.66.12 5.52 0 10-3.58 10-8S17.52 3 12 3Z" />
      </svg>
    ),
  },
  {
    provider: "naver",
    label: "네이버로 계속하기",
    className: "bg-[#03C75A] text-white",
    icon: (
      <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.27 12.84 7.5 0H0v24h7.73V11.16L16.5 24H24V0h-7.73v12.84Z" />
      </svg>
    ),
  },
];

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
  const { signIn, signInWithProvider } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = params.get("return_to") || "/requests";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const busy = loading !== null;

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) { toast.error("이용약관에 동의해주세요"); return; }
    setLoading("email");
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
      setLoading(null);
    }
  }

  async function handleSocial(provider: Provider) {
    if (!agreed) { toast.error("이용약관에 동의해주세요"); return; }
    if (provider === "naver") {
      toast.info("네이버 로그인은 준비 중입니다. Google 또는 카카오를 이용해주세요.");
      return;
    }
    if (provider !== "google" && provider !== "kakao") return;
    setLoading(provider);
    try {
      // OAuth 리다이렉트 — 성공 시 이 페이지를 떠난다
      await signInWithProvider(provider, returnTo);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "소셜 로그인 실패";
      toast.error(msg);
      setLoading(null);
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

        <Tabs defaultValue="email" className="w-full">
          <TabsList className="mb-5 w-full">
            <TabsTrigger value="email" className="flex-1">이메일</TabsTrigger>
            <TabsTrigger value="social" className="flex-1">소셜 로그인</TabsTrigger>
          </TabsList>

          {/* Email/PW tab */}
          <TabsContent value="email">
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
                {loading === "email" && <Loader2 className="size-4 animate-spin" />}
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
          </TabsContent>

          {/* Social tab */}
          <TabsContent value="social">
            <div className="mb-4 flex flex-col gap-2.5">
              {SOCIALS.map((s) => (
                <button
                  key={s.provider}
                  type="button"
                  disabled={busy}
                  onClick={() => handleSocial(s.provider)}
                  className={`flex h-[52px] w-full items-center justify-center gap-3 rounded-xl text-[15px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${s.className}`}
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

            <ConsentCheckbox agreed={agreed} onChange={setAgreed} disabled={busy} />
          </TabsContent>
        </Tabs>
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
