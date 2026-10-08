"use client";

import { Bell, Compass, Heart, Home, Luggage, Map, Search, Settings, User, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useMe } from "@/features/auth/api";
import { SearchDialog } from "@/features/explore/search-dialog";
import { useUI } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { Avatar } from "./ui";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const SIDEBAR: NavItem[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/trips", label: "My Trips", icon: Luggage },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

const BOTTOM: NavItem[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/map", label: "Map", icon: Map },
  { href: "/trips", label: "Trips", icon: Luggage },
  { href: "/profile", label: "Profile", icon: User },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const me = useMe();
  const [searchOpen, setSearchOpen] = useState(false);
  const viewing = useUI((s) => s.viewingTripOwner);
  const isOwnTrip = viewing === null || viewing === me.id;
  const profileActive = isActive(pathname, "/profile") || pathname.startsWith(`/u/${me.username}`);

  // ⌘K / Ctrl+K opens global search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="glass sticky top-3 m-3 mr-0 hidden h-[calc(100dvh-1.5rem)] w-64 shrink-0 flex-col rounded-3xl border border-border px-3 py-5 shadow-card md:flex">
        <Logo href="/home" className="px-2" />
        <button
          onClick={() => setSearchOpen(true)}
          className="mt-6 flex min-h-11 items-center gap-2.5 rounded-xl border border-border bg-surface px-3 text-sm text-muted shadow-soft transition duration-200 hover:text-fg"
        >
          <Search className="size-4" aria-hidden />
          <span className="flex-1 text-left">Search</span>
          <kbd className="rounded-md bg-surface-2 px-1.5 py-0.5 font-sans text-[11px]">⌘K</kbd>
        </button>
        <nav className="mt-4 grid gap-1" aria-label="Main">
          {SIDEBAR.map((item) => (
            <SideLink
              key={item.href}
              {...item}
              // Someone else's trip page shouldn't light up "My Trips".
              active={isActive(pathname, item.href) && !(item.href === "/trips" && pathname !== "/trips" && !isOwnTrip)}
              badge={item.href === "/notifications" ? me.unreadNotifications : item.href === "/friends" ? me.pendingRequests : 0}
            />
          ))}
        </nav>
        <div className="mt-auto grid gap-1 border-t border-border pt-4">
          <Link
            href="/profile"
            aria-current={profileActive ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-[15px] font-medium transition duration-200",
              profileActive ? "bg-surface text-brand shadow-soft" : "text-fg hover:bg-surface-2",
            )}
          >
            <Avatar user={me} size={26} />
            <span className="min-w-0 truncate">
              {me.firstName} {me.lastName}
            </span>
          </Link>
          <SideLink href="/settings" label="Settings" icon={Settings} active={isActive(pathname, "/settings")} />
        </div>
      </aside>

      <div className="min-w-0 flex-1 pb-20 md:pb-0">
        {/* Mobile top bar: search, friends, notifications (the bottom bar holds the main sections) */}
        <header className="glass sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border px-4 md:hidden">
          <Logo href="/home" />
          <div className="flex items-center gap-1">
            <IconButton label="Search" onClick={() => setSearchOpen(true)}>
              <Search className="size-5" />
            </IconButton>
            <IconButton label="Friends" href="/friends" badge={me.pendingRequests}>
              <Users className="size-5" />
            </IconButton>
            <IconButton label="Notifications" href="/notifications" badge={me.unreadNotifications}>
              <Bell className="size-5" />
            </IconButton>
          </div>
        </header>
        {children}
      </div>

      {/* Mobile bottom navigation */}
      <nav aria-label="Main" className="glass pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border shadow-float md:hidden">
        <div className="grid grid-cols-5">
          {BOTTOM.map(({ href, label, icon: Icon }) => {
            const active = href === "/profile" ? profileActive || isActive(pathname, "/settings") : isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 pt-1.5 pb-1 text-xs font-medium transition duration-200",
                  active ? "text-brand" : "text-muted",
                )}
              >
                <Icon className="size-6" aria-hidden />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

function SideLink({ href, label, icon: Icon, active, badge = 0 }: NavItem & { active: boolean; badge?: number }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition duration-200",
        active
          ? "bg-surface text-brand shadow-soft before:absolute before:top-2.5 before:bottom-2.5 before:left-0 before:w-[3px] before:rounded-full before:bg-gradient-to-b before:from-brand-bright before:to-ai"
          : "text-fg hover:bg-surface-2",
      )}
    >
      <Icon className="size-5" aria-hidden />
      <span className="flex-1">{label}</span>
      {badge > 0 && <Badge count={badge} label={label} />}
    </Link>
  );
}

function IconButton({
  label,
  href,
  onClick,
  badge = 0,
  children,
}: {
  label: string;
  href?: string;
  onClick?: () => void;
  badge?: number;
  children: ReactNode;
}) {
  const cls = "relative flex size-11 items-center justify-center rounded-xl text-fg transition duration-200 hover:bg-surface-2";
  const inner = (
    <>
      {children}
      {badge > 0 && <Badge count={badge} label={label} className="absolute top-1 right-1" />}
    </>
  );
  return href ? (
    <Link href={href} aria-label={label} className={cls}>
      {inner}
    </Link>
  ) : (
    <button onClick={onClick} aria-label={label} className={cls}>
      {inner}
    </button>
  );
}

function Badge({ count, label, className }: { count: number; label: string; className?: string }) {
  return (
    <span
      aria-label={`${count} new in ${label}`}
      className={cn(
        "flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[11px] leading-none font-semibold text-white",
        className,
      )}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

/** Standard page container + header used by every authenticated screen. */
export function Page({
  title,
  subtitle,
  actions,
  back,
  children,
  wide,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <main className={cn("animate-rise mx-auto w-full px-4 pt-5 pb-10 sm:px-6 md:pt-8", wide ? "max-w-6xl" : "max-w-3xl")}>
      {back}
      {(title || actions) && (
        <header className="mb-6 flex items-end justify-between gap-4">
          <div className="min-w-0">
            {title && <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>}
            {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </main>
  );
}
