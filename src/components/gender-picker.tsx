"use client";

import { Check } from "lucide-react";
import { useId, useRef } from "react";
import type { Gender } from "@/lib/types";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

/** Required two-way choice. Nothing is selected until the user picks. */
export function GenderPicker({
  value,
  onChange,
  error,
  label = "Gender",
}: {
  value: Gender | null;
  onChange: (g: Gender) => void;
  error?: string;
  label?: string;
}) {
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  // Radio-group keyboard behaviour: arrows move and select.
  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const next = (i + 1) % OPTIONS.length;
    onChange(OPTIONS[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div>
      <p id={`${id}-label`} className="mb-1.5 flex items-baseline justify-between text-sm font-medium">
        {label}
        <span className="text-xs font-normal text-muted">Required</span>
      </p>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        aria-required="true"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className="grid grid-cols-2 gap-2"
      >
        {OPTIONS.map((o, i) => {
          const selected = value === o.value;
          return (
            <button
              key={o.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              // With nothing selected, the first option is the tab stop.
              tabIndex={selected || (value === null && i === 0) ? 0 : -1}
              onClick={() => onChange(o.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "flex h-12 items-center justify-center gap-2 rounded-xl border text-[15px] font-semibold transition duration-200",
                selected
                  ? "border-brand bg-brand-soft text-brand shadow-soft"
                  : "border-border bg-surface text-fg shadow-soft hover:bg-surface-2",
                error && !selected && "border-danger",
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full border-2 transition duration-200",
                  selected ? "border-brand bg-brand text-brand-fg" : "border-border",
                )}
                aria-hidden
              >
                {selected && <Check className="size-3" strokeWidth={3} />}
              </span>
              {o.label}
            </button>
          );
        })}
      </div>
      {error && (
        <p id={`${id}-err`} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
