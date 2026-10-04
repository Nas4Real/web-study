import { CalendarPage } from "@/features/calendar/calendar-page";
import { loadCalendarPageData } from "@/server/study/calendar-page-loader";

export default async function CalendarRoute({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const data = await loadCalendarPageData(query);
  return <CalendarPage data={data} scope={typeof query.e2eScope === "string" ? query.e2eScope : undefined} />;
}
