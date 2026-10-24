import { SeoDashboard } from "@/features/admin/seo-dashboard";
import { requireAdmin } from "@/server/auth/admin";
import { getSeoStats } from "@/server/services/admin-seo";

export default async function AdminSeoPage() {
  await requireAdmin();
  return <SeoDashboard stats={await getSeoStats()} />;
}
