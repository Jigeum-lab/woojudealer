import Link from "next/link";

import { ISSUER } from "@/lib/types";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-card py-8 text-text-muted">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-6 px-4 sm:px-6 md:px-10">
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
        </div>
      </div>
    </footer>
  );
}
