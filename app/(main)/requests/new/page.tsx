"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, ClipboardList, Loader2 } from "lucide-react";

import { useAuth, useRequireAuth } from "@/lib/auth-context";
import { createRequest } from "@/lib/db/requests";
import { fetchCompanies } from "@/lib/db/companies";
import {
  MANUFACTURERS,
  OS_OPTIONS,
  PC_AGES,
  TIME_SLOTS,
} from "@/lib/types";
import { tomorrowISO } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const STEPS = [
  { n: 1, label: "회사 확인", desc: "등록된 회사 정보 확인" },
  { n: 2, label: "수량·사양", desc: "PC 수량 및 스펙 입력" },
  { n: 3, label: "픽업 일정", desc: "수거 날짜·주소 선택" },
];

export default function NewRequestPage() {
  const { authorized, isLoading } = useRequireAuth();
  const { company } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [confirmed, setConfirmed] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [age, setAge] = useState("");
  const [os, setOs] = useState("");
  const [note, setNote] = useState("");

  const [pickupDate, setPickupDate] = useState("");
  const [timeSlot, setTimeSlot] = useState<string>(TIME_SLOTS[0]);
  const [sameAddress, setSameAddress] = useState(true);
  const [address, setAddress] = useState("");
  const [request, setRequest] = useState("");

  const qtyNum = Number(quantity);
  const qtyValid = quantity !== "" && qtyNum >= 1 && qtyNum <= 999;

  const step2Valid = qtyValid && manufacturer && age && os;
  const effectiveAddress = sameAddress ? company?.address ?? "" : address;
  const step3Valid = !!pickupDate && !!effectiveAddress;

  const progress = useMemo(() => Math.round((step / 3) * 100), [step]);

  if (isLoading || !authorized) {
    return (
      <div className="flex flex-1 items-center justify-center py-32 text-text-muted">
        <Loader2 className="mr-2 size-5 animate-spin" /> 불러오는 중…
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-32 text-center">
        <p className="text-base font-semibold text-foreground">회사 정보를 먼저 등록해주세요</p>
        <p className="text-sm text-text-secondary">수거 신청을 하려면 마이페이지에서 회사 정보를 입력해야 합니다.</p>
        <Button asChild variant="cta">
          <Link href="/me">마이페이지에서 등록</Link>
        </Button>
      </div>
    );
  }

  function goNext() {
    if (step === 1 && !confirmed) return;
    if (step === 2 && !step2Valid) {
      if (!qtyValid) toast.error("수량은 1~999대 사이로 입력해주세요");
      return;
    }
    setStep((s) => Math.min(3, s + 1));
  }

  async function submit() {
    if (!step3Valid) {
      if (!pickupDate) toast.error("픽업 날짜를 선택해주세요");
      return;
    }
    setSubmitting(true);
    try {
      // bizNo로 Supabase 실제 UUID 조회 (mock auth의 "c1" 대신)
      const allCompanies = await fetchCompanies();
      const dbCompany =
        allCompanies.find((c) => company && c.bizNo === company.bizNo) ?? allCompanies[0];

      const req = await createRequest({
        companyId: dbCompany.id,
        createdBy: null,
        items: { quantity: qtyNum, manufacturer, age, os, note: note || undefined },
        pickup: {
          date: pickupDate,
          timeSlot,
          address: effectiveAddress,
          request: request || undefined,
        },
      });
      toast.success("신청이 접수되었습니다");
      router.push(`/requests?focus=${req.id}`);
    } catch {
      toast.error("신청 접수에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="border-b border-border bg-card py-5">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 md:px-10">
          <h1 className="text-[22px] font-bold text-foreground">수거 신청</h1>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 md:px-10 py-8">
        {/* Stepper */}
        <div className="mb-8 flex overflow-hidden rounded-xl border border-border bg-card">
          {STEPS.map((s) => {
            const state =
              s.n < step ? "done" : s.n === step ? "active" : "pending";
            return (
              <div
                key={s.n}
                className={cn(
                  "flex flex-1 flex-col gap-1 border-r border-border px-6 py-5 last:border-r-0",
                  state === "active" && "bg-brand-green-soft",
                  state === "done" && "bg-brand-green-soft"
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs font-bold",
                      state === "active" && "bg-primary text-white",
                      state === "done" && "bg-success text-white",
                      state === "pending" &&
                        "border-2 border-border bg-secondary text-text-muted"
                    )}
                  >
                    {state === "done" ? <Check className="size-3.5 stroke-[3]" /> : s.n}
                  </span>
                  <span
                    className={cn(
                      "text-[13px] font-bold",
                      state === "active" && "text-primary",
                      state === "done" && "text-success",
                      state === "pending" && "text-text-muted"
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                <span className="text-xs text-text-muted">{s.desc}</span>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_360px]">
          {/* Form */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border bg-brand-green-soft px-7 py-5">
              <div className="flex items-center gap-2.5 text-base font-bold text-primary">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-white">
                  {step}
                </span>
                {step === 1 && "회사 정보 확인"}
                {step === 2 && "PC 수량·사양 입력"}
                {step === 3 && "픽업 일정·주소"}
              </div>
            </div>

            <div className="p-7">
              {step === 1 && (
                <Step1
                  company={company}
                  confirmed={confirmed}
                  setConfirmed={setConfirmed}
                />
              )}
              {step === 2 && (
                <Step2
                  quantity={quantity}
                  setQuantity={setQuantity}
                  qtyValid={qtyValid}
                  manufacturer={manufacturer}
                  setManufacturer={setManufacturer}
                  age={age}
                  setAge={setAge}
                  os={os}
                  setOs={setOs}
                  note={note}
                  setNote={setNote}
                />
              )}
              {step === 3 && (
                <Step3
                  pickupDate={pickupDate}
                  setPickupDate={setPickupDate}
                  timeSlot={timeSlot}
                  setTimeSlot={setTimeSlot}
                  sameAddress={sameAddress}
                  setSameAddress={setSameAddress}
                  address={address}
                  setAddress={setAddress}
                  companyAddress={company.address}
                  request={request}
                  setRequest={setRequest}
                />
              )}
            </div>

            <div className="flex items-center justify-between gap-2.5 border-t border-border bg-secondary px-7 py-5">
              {step > 1 ? (
                <Button
                  variant="outline"
                  onClick={() => setStep((s) => s - 1)}
                  disabled={submitting}
                >
                  <ArrowLeft className="size-4" /> 이전
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link href="/me">마이페이지에서 수정</Link>
                </Button>
              )}

              {step < 3 ? (
                <Button
                  onClick={goNext}
                  disabled={(step === 1 && !confirmed) || (step === 2 && !step2Valid)}
                >
                  다음 단계 <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button
                  variant="cta"
                  onClick={submit}
                  disabled={submitting || !step3Valid}
                >
                  {submitting && <Loader2 className="size-4 animate-spin" />}
                  신청 제출
                </Button>
              )}
            </div>
          </div>

          {/* Summary sidebar */}
          <div className="sticky top-[88px] overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border bg-secondary px-5 py-4">
              <div className="text-sm font-bold text-foreground">신청 요약</div>
            </div>
            <div className="p-5">
              {step === 1 && quantity === "" ? (
                <div className="py-5 text-center text-[13px] text-text-muted">
                  <ClipboardList className="mx-auto mb-2 size-8 text-border-strong" />
                  단계를 완료하면
                  <br />
                  신청 내용이 표시됩니다
                </div>
              ) : (
                <div className="flex flex-col">
                  <SummaryRow label="회사" value={company.name} />
                  {quantity !== "" && (
                    <SummaryRow label="PC 수량" value={`${quantity}대`} />
                  )}
                  {manufacturer && (
                    <SummaryRow label="제조사" value={manufacturer} />
                  )}
                  {age && <SummaryRow label="연식" value={age} />}
                  {os && <SummaryRow label="OS" value={os} />}
                  {pickupDate && (
                    <SummaryRow label="픽업일" value={pickupDate} />
                  )}
                  {step === 3 && <SummaryRow label="시간대" value={timeSlot} />}
                </div>
              )}

              <div className="mt-4 rounded-md border border-primary/30 bg-brand-green-soft px-4 py-3">
                <div className="mb-2 text-xs font-semibold text-primary">
                  진행 상황 — {step}/3 단계
                </div>
                <div className="h-1.5 rounded-full bg-primary/30">
                  <div
                    className="h-1.5 rounded-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border py-2.5 text-[13px] last:border-b-0">
      <span className="font-medium text-text-secondary">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

function Step1({
  company,
  confirmed,
  setConfirmed,
}: {
  company: { name: string; bizNo: string; contact: string; phone: string };
  confirmed: boolean;
  setConfirmed: (v: boolean) => void;
}) {
  const rows = [
    ["회사명", company.name],
    ["사업자번호", company.bizNo],
    ["담당자", company.contact],
    ["연락처", company.phone],
  ];
  return (
    <div>
      <p className="mb-5 rounded-md bg-secondary px-4 py-3 text-[13px] text-text-secondary">
        아래 정보가 정확한지 확인해주세요. 수정이 필요하면 마이페이지에서 변경할 수
        있습니다.
      </p>
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="grid grid-cols-[140px_1fr] items-center gap-3 border-b border-border py-3 text-sm last:border-b-0"
        >
          <span className="font-semibold text-text-secondary">{label}</span>
          <span className="font-medium text-foreground">{value}</span>
        </div>
      ))}
      <label className="mt-5 flex cursor-pointer items-center gap-2.5 rounded-md bg-secondary px-4 py-3.5">
        <Checkbox
          checked={confirmed}
          onCheckedChange={(v) => setConfirmed(v === true)}
        />
        <span className="text-sm font-semibold text-foreground">
          위 정보가 맞습니다
        </span>
      </label>
    </div>
  );
}

function Step2(props: {
  quantity: string;
  setQuantity: (v: string) => void;
  qtyValid: boolean;
  manufacturer: string;
  setManufacturer: (v: string) => void;
  age: string;
  setAge: (v: string) => void;
  os: string;
  setOs: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-1.5">
        <Label htmlFor="qty">PC 수량 *</Label>
        <div className="flex items-center gap-2">
          <Input
            id="qty"
            type="number"
            min={1}
            max={999}
            value={props.quantity}
            onChange={(e) => props.setQuantity(e.target.value)}
            placeholder="예: 30"
            className="max-w-[160px]"
            aria-invalid={props.quantity !== "" && !props.qtyValid}
          />
          <span className="text-sm text-text-secondary">대</span>
        </div>
        {props.quantity !== "" && !props.qtyValid && (
          <p className="text-xs text-destructive">
            수량은 1~999대 사이로 입력해주세요
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <SelectField
          label="제조사 *"
          value={props.manufacturer}
          onChange={props.setManufacturer}
          options={[...MANUFACTURERS]}
          placeholder="선택"
        />
        <SelectField
          label="연식 *"
          value={props.age}
          onChange={props.setAge}
          options={[...PC_AGES]}
          placeholder="선택"
        />
      </div>

      <SelectField
        label="OS *"
        value={props.os}
        onChange={props.setOs}
        options={[...OS_OPTIONS]}
        placeholder="선택"
      />

      <div className="grid gap-1.5">
        <Label htmlFor="note">비고 (선택)</Label>
        <Textarea
          id="note"
          value={props.note}
          onChange={(e) => props.setNote(e.target.value)}
          placeholder="특이사항이 있다면 입력해주세요"
        />
      </div>
    </div>
  );
}

function Step3(props: {
  pickupDate: string;
  setPickupDate: (v: string) => void;
  timeSlot: string;
  setTimeSlot: (v: string) => void;
  sameAddress: boolean;
  setSameAddress: (v: boolean) => void;
  address: string;
  setAddress: (v: string) => void;
  companyAddress: string;
  request: string;
  setRequest: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="date">희망 픽업일 *</Label>
          <Input
            id="date"
            type="date"
            min={tomorrowISO()}
            value={props.pickupDate}
            onChange={(e) => props.setPickupDate(e.target.value)}
          />
        </div>
        <SelectField
          label="희망 시간대 *"
          value={props.timeSlot}
          onChange={props.setTimeSlot}
          options={[...TIME_SLOTS]}
          placeholder="선택"
        />
      </div>

      <div className="grid gap-1.5">
        <Label>픽업 주소 *</Label>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-text-secondary">
          <Checkbox
            checked={props.sameAddress}
            onCheckedChange={(v) => props.setSameAddress(v === true)}
          />
          회사 주소와 동일
        </label>
        {props.sameAddress ? (
          <div className="rounded-md bg-secondary px-3.5 py-2.5 text-sm text-foreground">
            {props.companyAddress}
          </div>
        ) : (
          <Input
            value={props.address}
            onChange={(e) => props.setAddress(e.target.value)}
            placeholder="픽업 주소를 입력해주세요"
          />
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="req">요청사항 (선택)</Label>
        <Textarea
          id="req"
          value={props.request}
          onChange={(e) => props.setRequest(e.target.value)}
          placeholder="예: 1층 로비에서 픽업 부탁드립니다"
        />
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
