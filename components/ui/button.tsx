import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]",
        variant === "primary" &&
          "bg-gradient-to-b from-[#E4C155] to-[#C9A227] text-bg shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_4px_14px_-2px_var(--gold-glow)] hover:shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_6px_20px_-2px_var(--gold-glow)] hover:brightness-105",
        variant === "secondary" &&
          "bg-surface-2 text-text border border-hairline hover:bg-surface hover:border-hairline-strong",
        variant === "ghost" && "text-text-muted hover:text-text hover:bg-surface-2/60",
        className
      )}
      {...props}
    />
  );
}
