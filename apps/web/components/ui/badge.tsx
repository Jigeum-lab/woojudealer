import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap [&>svg]:size-3 before:size-1.5 before:rounded-full before:bg-current",
  {
    variants: {
      variant: {
        default: "bg-secondary text-text-secondary",
        primary: "bg-brand-green-soft text-primary",
        outline: "border border-border text-text-secondary before:hidden",
        requested: "bg-slate-500/15 text-slate-300",
        pickup: "bg-amber-500/15 text-amber-300",
        wiping: "bg-sky-500/15 text-sky-300",
        certified: "bg-brand-green-soft text-primary",
        done: "bg-violet-500/15 text-violet-300",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";
  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
