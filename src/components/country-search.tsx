"use client";

import { Sparkles } from "lucide-react";
import { useId, useState } from "react";
import { searchCountries } from "@/lib/countries";
import type { Country, CountryStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Type-ahead country picker. Also the keyboard-friendly way into the map. */
export function CountrySearch({
  onPick,
  placeholder = "Search countries…",
  statuses,
  className,
  autoFocus,
}: {
  onPick: (country: Country) => void;
  placeholder?: string;
  statuses?: Record<string, CountryStatus>;
  className?: string;
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const listId = useId();
  const results = searchCountries(q, 7);

  const pick = (c: Country) => {
    onPick(c);
    setQ("");
    setOpen(false);
  };

  return (
    <div className={cn("relative", className)}>
      <Sparkles aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ai" />
      <input
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label={placeholder}
        autoFocus={autoFocus}
        value={q}
        placeholder={placeholder}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && results[active]) {
            e.preventDefault();
            pick(results[active]);
          } else if (e.key === "Escape" && q) {
            e.stopPropagation();
            setQ("");
          }
        }}
        className="h-12 w-full rounded-2xl border border-border bg-surface pr-3 pl-10 text-base shadow-soft outline-none transition duration-200 placeholder:text-muted/80 focus:border-ai/60 focus:ring-4 focus:ring-ai/15"
      />
      {open && results.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="animate-rise glass absolute top-full right-0 left-0 z-30 mt-2 overflow-hidden rounded-2xl border border-border p-1 shadow-float"
        >
          {results.map((c, i) => (
            <li
              key={c.code}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(c)}
              onMouseEnter={() => setActive(i)}
              className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm transition duration-150", i === active && "bg-ai-soft")}
            >
              <span className="text-xl">{c.flag}</span>
              <span className="min-w-0 flex-1 truncate">
                {c.name}
                <span className="ml-1.5 text-muted">{c.region}</span>
              </span>
              {statuses?.[c.code] && <StatusDot status={statuses[c.code]} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function StatusDot({ status }: { status: CountryStatus }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium",
        status === "visited" ? "bg-visited-soft text-visited" : "bg-wishlist-soft text-wishlist",
      )}
    >
      {status === "visited" ? "Visited" : "Wishlist"}
    </span>
  );
}
