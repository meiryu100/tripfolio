import { Globe2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5 font-heading text-lg font-bold tracking-tight", className)}>
      <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-bright to-ai text-white shadow-soft">
        <Globe2 className="size-5" aria-hidden />
      </span>
      Travora
    </Link>
  );
}
