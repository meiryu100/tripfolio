import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { TeamChart } from "@/features/admin/team-chart";
import { requireAdmin } from "@/server/auth/admin";

export const metadata: Metadata = {
  title: "Admin | Tripfolio",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const { user } = await requireAdmin();
  return (
    <div className="min-h-dvh">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <span className="text-sm text-muted">
            Admin · {user.firstName} {user.lastName}
          </span>
        </div>
      </header>
      <main className="px-4 py-10 sm:px-6">
        <TeamChart />
      </main>
    </div>
  );
}
