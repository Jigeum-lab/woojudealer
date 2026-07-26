"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "!rounded-md !border !border-border !bg-card !text-foreground !shadow-lg !font-sans",
          description: "!text-text-secondary",
          actionButton: "!bg-primary !text-primary-foreground",
          cancelButton: "!bg-secondary !text-secondary-foreground",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
