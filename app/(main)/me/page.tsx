"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Mail, ShieldCheck } from "lucide-react";

import { useAuth, useRequireAuth } from "@/lib/auth-context";
import { fetchCompanies, upsertCompany } from "@/lib/db/companies";
import { Company, Provider } from "@/lib/types";
import { formatBizNo, isValidBizNo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PROVIDER_LABEL: Record<Provider, string> = {
  google: "Google",
  kakao: "카카오",
  naver: "네이버",
  admin: "운영자 계정",
};

export default function MyPage() {
  const { authorized } = useRequireAuth();
  const { user, company, updateCompany } = useAuth();

  const [form, setForm] = useState<Company | null>(null);
  const [bizError, setBizError] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (company) setForm({ ...company });
  }, [company]);

  if (!authorized || !user) {
    return (
      <div className="flex flex-1 items-center justify-center py-32 text-text-muted">
        <Loader2 className="mr-2 size-5 animate-spin" /> 불러오는 중…
      </div>
    );
  }

  async function save() {
    if (!form) return;
    if (!isValidBizNo(form.bizNo)) {
      setBizError(true);
      toast.error("사업자번호 형식을 확인해주세요 (000-00-00000)");
      return;
    }
    setSaving(true);
    try {
      const allCompanies = await fetchCompanies();
      const existing = allCompanies.find((c) => c.bizNo === form.bizNo);
      await upsertCompany({ ...form, id: existing?.id ?? form.id });
      updateCompany(form);
      toast.success("회사 정보가 저장되었습니다");
    } catch {
      toast.error("저장에 실패했습니다. 다시 시도해주세요");
    } finally {
      setSaving(false);
    }
  }

  const dirty =
    !!form && !!company && JSON.stringify(form) !== JSON.stringify(company);

  return (
    <div className="mx-auto w-full max-w-[760px] px-10 py-10">
      <h1 className="mb-6 text-[22px] font-bold text-foreground">마이페이지</h1>

      {/* Account card */}
      <div className="mb-6 rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-bold text-text-secondary">계정 정보</h2>
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-full bg-brand-green-soft text-lg font-bold text-primary">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="text-base font-bold text-foreground">{user.name}</div>
            <div className="flex items-center gap-1.5 text-sm text-text-secondary">
              <Mail className="size-3.5" /> {user.email}
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-text-secondary">
            <ShieldCheck className="size-3.5" />
            {PROVIDER_LABEL[user.provider]} 연동
          </span>
        </div>
      </div>

      {/* Company form */}
      {form ? (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-5 text-sm font-bold text-text-secondary">회사 정보</h2>
          <div className="flex flex-col gap-4">
            <Field label="회사명">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="사업자등록번호" error={bizError ? "000-00-00000 형식으로 입력해주세요" : undefined}>
              <Input
                value={form.bizNo}
                inputMode="numeric"
                onChange={(e) => {
                  setForm({ ...form, bizNo: formatBizNo(e.target.value) });
                  setBizError(false);
                }}
                aria-invalid={bizError}
                placeholder="000-00-00000"
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="담당자명">
                <Input
                  value={form.contact}
                  onChange={(e) => setForm({ ...form, contact: e.target.value })}
                />
              </Field>
              <Field label="연락처">
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </Field>
            </div>
            <Field label="주소">
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </Field>
          </div>

          <div className="mt-6 flex justify-end gap-2.5">
            <Button
              variant="outline"
              onClick={() => company && setForm({ ...company })}
              disabled={!dirty || saving}
            >
              취소
            </Button>
            <Button onClick={save} disabled={!dirty || saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              저장
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border-strong bg-card p-8 text-center text-sm text-text-secondary">
          운영자 계정은 회사 정보가 없습니다.
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
