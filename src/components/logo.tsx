import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import mark from "../../public/brand/tripfolio-mark.png";

/** Brand logo: the globe-pin emblem plus the two-tone "Trip|folio" wordmark. */
export function Logo({ href = "/", className, size = "md" }: { href?: string; className?: string; size?: "md" | "lg" }) {
  return (
    <Link
      href={href}
      aria-label="Tripfolio home"
      className={cn("group flex items-center gap-2 font-heading font-extrabold tracking-tight", size === "lg" ? "text-3xl" : "text-xl", className)}
    >
      <Image
        src={mark}
        alt=""
        priority
        className={cn(
          "w-auto drop-shadow-sm transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-rotate-6 group-hover:scale-105",
          size === "lg" ? "h-14" : "h-9",
        )}
      />
      <span aria-hidden>
        <span className="text-[#003180] dark:text-white">Trip</span>
        <span className="text-[#06a6f2] dark:text-[#38bdf8]">folio</span>
      </span>
    </Link>
  );
}
