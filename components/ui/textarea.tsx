import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-20 w-full rounded-md border-[1.5px] border-input bg-white px-3.5 py-2.5 text-sm text-foreground transition-colors outline-none",
        "placeholder:text-text-muted",
        "focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/10",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
