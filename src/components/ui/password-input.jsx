"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const PasswordInput = React.forwardRef(function PasswordInput(
  { className, disabled, visibilityLabel = "contraseña", ...props },
  ref,
) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        ref={ref}
        type={visible ? "text" : "password"}
        disabled={disabled}
        className={cn("min-h-11 pr-12", className)}
      />
      <button
        type="button"
        disabled={disabled}
        aria-label={`${visible ? "Ocultar" : "Mostrar"} ${visibilityLabel}`}
        aria-pressed={visible}
        aria-controls={props.id}
        onClick={() => setVisible((value) => !value)}
        className="absolute inset-y-0 right-0 flex min-h-11 w-11 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
      >
        {visible ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
      </button>
    </div>
  );
});

export { PasswordInput };
