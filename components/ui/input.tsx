import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-[42px] w-full rounded-md border-[1.5px] border-input bg-white px-3.5 text-sm text-foreground transition-colors outline-none",
        "placeholder:text-text-muted",
        "focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/10",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/15",
        className
      )}
      {...props}
    />
  );
}

export { Input };
