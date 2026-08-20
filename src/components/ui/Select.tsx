import { type SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, children, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-ink-700">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          className={cn(
            "w-full rounded-lg border border-line-200 bg-white px-4 py-2.5 text-sm text-ink-900",
            "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100",
            error && "border-danger-500",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-xs text-danger-500">{error}</p>}
      </div>
    );
  },
);
Select.displayName = "Select";
