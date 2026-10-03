import { Dashboard } from "@/features/dashboard/dashboard";
import { loadDashboardPageData } from "@/server/study/dashboard-page-loader";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ e2eScope?: string | string[] }> }) {
  const { e2eScope } = await searchParams;
  return <Dashboard dashboard={await loadDashboardPageData(typeof e2eScope === "string" ? e2eScope : undefined)} />;
}
