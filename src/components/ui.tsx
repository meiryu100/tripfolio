"use client";

import { AlertTriangle, Compass, Loader2, X } from "lucide-react";
import Link from "next/link";
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import type { UserSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

// ─── Button ──────────────────────────────────────────────────────────────────

type Variant = "primary" | "secondary" | "ghost" | "danger" | "visited" | "wishlist";
type Size = "sm" | "md" | "lg";

// Soft UI Evolution: raised by a soft layered shadow, pressed with an inset one.
const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-brand to-[color-mix(in_oklab,var(--brand)_88%,black)] text-brand-fg shadow-soft hover:brightness-110 active:shadow-pressed",
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
    "inline-flex items-center justify-center font-semibold transition duration-200 ease-out select-none whitespace-nowrap active:translate-y-px",
    "disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-bright",
    variants[variant],
    sizes[size],
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, className, children, disabled, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={buttonClass(variant, size, className)}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
});

/** AI-native loading indicator: a 3-dot pulse. */
export function Spinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <span role="status" aria-label={label} className={cn("typing-dots text-brand-bright", className)}>
      <span />
      <span />
      <span />
    </span>
  );
}

// ─── Form fields ─────────────────────────────────────────────────────────────

const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3.5 text-base text-fg shadow-[inset_0_1px_2px_rgb(19_78_74/0.06)] placeholder:text-muted/80 outline-none transition duration-200 focus:border-brand-bright focus:ring-4 focus:ring-brand-bright/15 aria-invalid:border-danger aria-invalid:ring-danger/15";

interface FieldProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldProps>(
  function Input({ label, error, hint, optional, className, id, ...props }, ref) {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <div className={className}>
        <label htmlFor={inputId} className="mb-1.5 flex items-baseline justify-between text-sm font-medium">
          {label}
          {optional && <span className="text-xs font-normal text-muted">Optional</span>}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-err` : undefined}
          className={cn(inputClass, "h-11")}
          {...props}
        />
        {error ? (
          <p id={`${inputId}-err`} className="mt-1.5 text-sm text-danger">
            {error}
          </p>
        ) : hint ? (
          <p className="mt-1.5 text-xs text-muted">{hint}</p>
        ) : null}
      </div>
    );
  },
);

export function Textarea({
  label,
  error,
  optional,
  className,
  id,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 flex items-baseline justify-between text-sm font-medium">
        {label}
        {optional && <span className="text-xs font-normal text-muted">Optional</span>}
      </label>
      <textarea
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={cn(inputClass, "min-h-24 resize-y py-2.5")}
        {...props}
      />
      {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      {message}
    </div>
  );
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

const AVATAR_HUES = [210, 150, 20, 280, 340, 45, 190, 100];

export function Avatar({
  user,
  size = 40,
  className,
}: {
  user: Pick<UserSummary, "firstName" | "lastName" | "avatarUrl" | "id"> | null;
  size?: number;
  className?: string;
}) {
  const initials = user ? `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase() : "?";
  const hue = user ? AVATAR_HUES[[...user.id].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_HUES.length] : 0;
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold", className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: user?.avatarUrl ? undefined : `linear-gradient(135deg, hsl(${hue} 70% 62%), hsl(${hue + 30} 70% 48%))`,
        color: "white",
      }}
    >
      {user?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatarUrl} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
      ) : (
        <span aria-hidden>{initials}</span>
      )}
    </span>
  );
}

export function Flag({ emoji, className }: { emoji: string; className?: string }) {
  return (
    <span className={cn("inline-block leading-none", className)} aria-hidden>
      {emoji}
    </span>
  );
}

// ─── States ──────────────────────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-surface-2", className)} />;
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("animate-rise flex flex-col items-center rounded-2xl border border-border bg-surface/70 px-6 py-10 text-center shadow-soft", className)}>
      <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand shadow-soft [&_svg]:size-6" aria-hidden>
        {icon}
      </div>
      <p className="font-semibold">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong.",
  body,
  onRetry,
}: {
  title?: string;
  body?: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="animate-rise flex flex-col items-center rounded-2xl border border-border bg-surface px-6 py-10 text-center shadow-card">
      <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-danger/10 text-danger">
        <AlertTriangle className="size-6" />
      </div>
      <p className="font-semibold">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>}
      {onRetry && (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function NotFound({ title, body }: { title: string; body?: string }) {
  return (
    <EmptyState
      icon={<Compass />}
      title={title}
      body={body}
      action={
        <Link href="/home" className={buttonClass("secondary")}>
          Back home
        </Link>
      }
    />
  );
}

// ─── Modal / bottom sheet ────────────────────────────────────────────────────

// Open sheets, innermost last — only the top one reacts to Escape.
const sheetStack: symbol[] = [];

/** Centered dialog on desktop, bottom sheet on mobile. */
export function Sheet({
  open,
  onClose,
  children,
  label,
  className,
  z = 50,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
  className?: string;
  z?: number;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const token = Symbol();
    sheetStack.push(token);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && sheetStack[sheetStack.length - 1] === token) closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      sheetStack.splice(sheetStack.indexOf(token), 1);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-6" style={{ zIndex: z }}>
      <div className="animate-fade absolute inset-0 bg-[#0b2a2e]/35 backdrop-blur-[3px]" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={cn(
          "animate-sheet relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-surface shadow-float outline-none sm:max-w-lg sm:rounded-3xl",
          className,
        )}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-border sm:hidden" />
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function SheetClose({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      aria-label="Close"
      className={cn("flex size-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg", className)}
    >
      <X className="size-5" />
    </button>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition duration-200 before:absolute before:-inset-x-1 before:-inset-y-2.5 before:content-['']",
        checked ? "bg-brand" : "bg-surface-2 shadow-pressed",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}
