import Link from "next/link";
import { ArrowRight, PackageOpen, ShoppingCart } from "lucide-react";

/**
 * 견적 요청 갈림길.
 *
 * 우주딜러는 사기도 하고 팔기도 해서 "견적"이 두 방향을 가리킨다.
 * 랜딩에서는 각 방향으로 바로 보내지만, 이 주소로 직접 들어온 사람에게는
 * 어느 쪽인지부터 묻는다.
 */

const PATHS = [
  {
    href: "/estimate/sell",
    icon: PackageOpen,
    eyebrow: "매입",
    title: "폐PC를 처분하려고 합니다",
    desc: "쓰지 않는 PC가 얼마나 되는지 알려주시면 개략 금액을 회신드립니다. 사양을 모르셔도 됩니다.",
  },
  {
    href: "/estimate/build",
    icon: ShoppingCart,
    eyebrow: "판매",
    title: "재생 PC를 구매하려고 합니다",
    desc: "부품을 직접 담으면 호환성과 금액이 바로 나옵니다. 고르기 어려우시면 용도·예산만 남기셔도 됩니다.",
  },
];

export default function EstimatePage() {
  return (
    <div className="mx-auto w-full max-w-[860px] px-4 py-14 sm:px-6 md:px-10">
      <p className="mb-3 font-mono text-[12px] uppercase tracking-[0.18em] text-text-muted">
        견적 요청
      </p>
      <h1 className="mb-4 text-[28px] font-black leading-tight tracking-[-0.02em] text-foreground md:text-[34px]">
        어느 쪽이신가요?
      </h1>
      <p className="mb-10 max-w-[560px] text-[15px] leading-relaxed text-text-secondary">
        우주딜러는 폐PC를 사들이고, 되살린 PC를 팝니다. 두 방향 모두 가입 없이
        문의하실 수 있습니다.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {PATHS.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="group flex flex-col rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
          >
            <p.icon className="mb-5 size-6 text-text-muted transition-colors group-hover:text-primary" />
            <span className="mb-2 font-mono text-[11.5px] uppercase tracking-[0.15em] text-text-muted">
              {p.eyebrow}
            </span>
            <h2 className="mb-2.5 text-[17px] font-bold leading-snug text-foreground">
              {p.title}
            </h2>
            <p className="mb-6 flex-1 text-[13px] leading-relaxed text-text-secondary">
              {p.desc}
            </p>
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary">
              견적 요청하기 <ArrowRight className="size-4" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
