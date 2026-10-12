import { cn } from "@/lib/utils";

// Button styles live outside the client-only ui.tsx so server components can use them too.

export type Variant = "primary" | "secondary" | "ghost" | "danger" | "visited" | "wishlist";
export type Size = "sm" | "md" | "lg";

// Soft UI Evolution: raised by a soft layered shadow, pressed with an inset one.
const variants: Record<Variant, string> = {
  primary:
    "shine bg-gradient-to-r from-brand to-brand-2 text-brand-fg shadow-soft hover:shadow-glow hover:-translate-y-px active:translate-y-0 active:shadow-pressed",
  secondary: "bg-surface text-fg border border-border shadow-soft hover:bg-surface-2 active:shadow-pressed",
  ghost: "text-fg hover:bg-surface-2 active:shadow-pressed",
  danger: "bg-danger text-white shadow-soft hover:brightness-110 active:shadow-pressed",
  visited: "bg-visited text-on-status shadow-soft hover:brightness-110 active:shadow-pressed",
  wishlist: "bg-wishlist text-on-status shadow-soft hover:brightness-110 active:shadow-pressed",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5 rounded-lg",
  md: "h-11 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-base gap-2 rounded-xl",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center font-semibold transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] select-none whitespace-nowrap active:translate-y-px",
    "disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-bright",
    variants[variant],
    sizes[size],
    className,
  );
}
