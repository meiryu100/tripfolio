import { TeamChart } from "@/features/admin/team-chart";
import { requireAdmin } from "@/server/auth/admin";

export default async function AdminTeamPage() {
  await requireAdmin();
  return <TeamChart />;
}
