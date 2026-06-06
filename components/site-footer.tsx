"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { ISSUER } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function SiteFooter() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleReset() {
    setBusy(true);
    try {
      const supabase = createClient();
      await supabase.from("requests").delete().gte("created_at", "1970-01-01");
      await supabase.from("certificates").delete().gte("created_at", "1970-01-01");
      toast.success("데모 데이터를 초기화했습니다");
      setTimeout(() => {
        window.location.href = "/";
      }, 700);
    } catch {
      toast.error("초기화에 실패했습니다. 다시 시도해주세요");
      setBusy(false);
    }
  }

  return (
    <footer className="mt-auto border-t border-border bg-card py-8 text-text-muted">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-6 px-10">
        <div className="text-[13px]">
          <div className="mb-1.5 font-bold text-foreground">
            {ISSUER.brand} ({ISSUER.name})
          </div>
          <div className="leading-relaxed">
            대표 {ISSUER.ceo} &nbsp;|&nbsp; 사업자등록번호 {ISSUER.bizNo} &nbsp;|&nbsp;{" "}
            {ISSUER.email}
            <br />
            {ISSUER.address}
          </div>
        </div>
        <div className="flex items-center gap-5 text-[13px]">
          <Link href="/support#terms" className="hover:text-primary">
            이용약관
          </Link>
          <Link href="/support#privacy" className="hover:text-primary">
            개인정보처리방침
          </Link>
          <Link href="/support" className="hover:text-primary">
            FAQ
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-primary/50 hover:bg-brand-green-soft hover:text-primary"
          >
            <RotateCcw className="size-3.5" />
            데모 리셋
          </button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>데모 데이터를 초기화할까요?</DialogTitle>
            <DialogDescription>
              모든 신청·인증서·로그인 정보가 시드 상태로 되돌아갑니다. 이 작업은
              되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              취소
            </Button>
            <Button variant="destructive" onClick={handleReset} disabled={busy}>
              {busy ? "초기화 중…" : "초기화"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </footer>
  );
}
