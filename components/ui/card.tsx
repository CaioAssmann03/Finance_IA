import { HTMLAttributes } from "react";
import clsx from "clsx";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Ativa leve destaque ao passar o mouse — usar em cards clicáveis/navegáveis. */
  interativo?: boolean;
}

export function Card({ className, interativo = false, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        "relative min-w-0 rounded-lg border border-hairline bg-surface p-5",
        "shadow-[var(--shadow-card)]",
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-b before:from-white/[0.03] before:to-transparent",
        interativo &&
          "transition-all duration-200 hover:-translate-y-0.5 hover:border-hairline-strong hover:shadow-[var(--shadow-elevated)]",
        className
      )}
      {...props}
    />
  );
}
