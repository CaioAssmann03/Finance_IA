import { InputHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm text-text-muted">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={clsx(
            "rounded-md border border-hairline bg-surface px-3 py-2.5 text-text placeholder:text-text-muted/60 transition-colors",
            "focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20",
            error && "border-brick",
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-brick">{error}</span>}
      </div>
    );
  }
);
Input.displayName = "Input";
