import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { AdminNav } from "@/features/admin/admin-nav";
import { requireAdmin } from "@/server/auth/admin";

export const metadata: Metadata = {
  title: "Admin | Tripfolio",
  robots: { index: false, follow: false },
};

// Each admin page also calls requireAdmin(): a layout check alone doesn't stop a page from rendering.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { user } = await requireAdmin();
  return (
    <div className="min-h-dvh">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />
          <AdminNav />
          <span className="hidden text-sm text-muted sm:inline">
            Admin · {user.firstName} {user.lastName}
          </span>
        </div>
      </header>
      <main className="px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}
