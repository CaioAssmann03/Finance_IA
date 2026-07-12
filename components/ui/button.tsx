import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "primary" && "bg-gold text-bg hover:brightness-110",
        variant === "secondary" &&
          "bg-surface-2 text-text border border-hairline hover:bg-surface",
        variant === "ghost" && "text-text-muted hover:text-text",
        className
      )}
      {...props}
    />
  );
}
