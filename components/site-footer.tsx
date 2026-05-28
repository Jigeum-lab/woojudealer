"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";

import { resetDemo } from "@/lib/store";
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

  function handleReset() {
    setBusy(true);
    resetDemo();
    toast.success("데모 데이터를 초기화했습니다");
    setTimeout(() => {
      window.location.href = "/";
    }, 700);
  }

  return (
    <footer className="mt-auto bg-foreground py-8 text-text-muted">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-6 px-10">
        <div className="text-[13px]">
          <div className="mb-1.5 font-bold text-white">
            우주딜러 (주식회사 우주시스템)
          </div>
          <div>
            사업자번호: 123-45-67890 &nbsp;|&nbsp; 대표: 우정현 &nbsp;|&nbsp;
            contact@woojudealer.com
          </div>
        </div>
        <div className="flex items-center gap-5 text-[13px]">
          <Link href="/support#terms" className="hover:text-white">
            이용약관
          </Link>
          <Link href="/support#privacy" className="hover:text-white">
            개인정보처리방침
          </Link>
          <Link href="/support" className="hover:text-white">
            FAQ
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex cursor-pointer items-center gap-1.5 rounded-md border border-white/20 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
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
