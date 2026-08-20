import { useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  id: string;
  name: string;
}

interface MultiSelectProps {
  label?: string;
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

export function MultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "Choose from Drop-down",
  error,
  disabled,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dropdown ke bahar click ho to close kar do
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (id: string) => {
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id],
    );
  };

  const selectedOptions = options.filter((o) => value.includes(o.id));

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      {label && (
        <label className="text-sm font-medium text-ink-700">{label}</label>
      )}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex min-h-[42px] w-full items-center justify-between gap-2 rounded-lg border border-line-200 px-4 py-2 text-sm",
            "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100",
            disabled && "cursor-not-allowed bg-line-100 text-ink-300",
            error && "border-danger-500",
          )}
        >
          <span className="flex flex-wrap gap-1">
            {selectedOptions.length === 0 && (
              <span className="text-ink-300">{placeholder}</span>
            )}
            {selectedOptions.map((o) => (
              <span
                key={o.id}
                className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-600"
              >
                {o.name}
                <X
                  size={12}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleOption(o.id);
                  }}
                />
              </span>
            ))}
          </span>
          <ChevronDown size={16} className="shrink-0 text-ink-500" />
        </button>

        {open && !disabled && (
          <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-line-200 bg-white shadow-lg">
            {options.length === 0 && (
              <p className="p-3 text-sm text-ink-300">No options</p>
            )}
            {options.map((o) => (
              <label
                key={o.id}
                className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-line-100"
              >
                <input
                  type="checkbox"
                  checked={value.includes(o.id)}
                  onChange={() => toggleOption(o.id)}
                  className="accent-brand-500"
                />
                {o.name}
              </label>
            ))}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-danger-500">{error}</p>}
    </div>
  );
}
