import { SettingsPage } from "@/features/settings/settings-page";
import { loadSettingsPageData } from "@/server/study/settings-page-loader";

export default async function SettingsRoute({ searchParams }: { searchParams: Promise<{ e2eScope?: string }> }) {
  const data = await loadSettingsPageData((await searchParams).e2eScope);
  return <SettingsPage data={data} />;
}
