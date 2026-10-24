"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "סטטיסטיקות" },
  { href: "/admin/seo", label: "רובוטים ו-SEO" },
  { href: "/admin/team", label: "צוות" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav dir="rtl" className="flex gap-1">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={pathname === l.href ? "page" : undefined}
          className="rounded-full px-3 py-1.5 text-sm font-medium text-muted hover:text-fg aria-[current=page]:bg-brand-soft aria-[current=page]:text-brand"
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
