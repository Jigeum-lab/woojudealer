"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <div className="print:hidden fixed right-6 top-6 z-50">
      <button
        type="button"
        onClick={() => window.print()}
        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg hover:brightness-110"
      >
        <Printer className="size-4" />
        PDF 저장 / 인쇄
      </button>
    </div>
  );
}
