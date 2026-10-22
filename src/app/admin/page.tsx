import { StatsDashboard } from "@/features/admin/stats-dashboard";
import { requireAdmin } from "@/server/auth/admin";
import { getAdminStats } from "@/server/services/admin-stats";

export default async function AdminStatsPage() {
  await requireAdmin();
  const stats = await getAdminStats();
  return <StatsDashboard stats={stats} generatedAt={new Date().toISOString()} />;
}
