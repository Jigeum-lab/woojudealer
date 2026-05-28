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
        primary: "bg-blue-50 text-primary",
        outline: "border border-border text-text-secondary before:hidden",
        requested: "bg-slate-100 text-slate-500",
        pickup: "bg-amber-100 text-amber-800",
        wiping: "bg-blue-100 text-blue-800",
        certified: "bg-green-100 text-green-800",
        done: "bg-violet-100 text-violet-800",
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
