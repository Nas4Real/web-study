"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { CalendarPageDataDTO, CalendarView, CalendarVisualEventDTO } from "@/domain/dto";
import { sessionDetailFixture } from "@/fixtures";
import type { SessionOccurrenceTarget } from "@/server/study/session-detail-service";

import { CalendarHeader } from "./calendar-header";
import { NewSessionModal } from "./new-session-modal";
import { formatCalendarPeriod, shiftCalendarPeriod } from "./calendar-period";
import { SessionDetailsModal } from "./session-details-modal";
import { SessionDetailProvider, useSessionDetail } from "./use-session-detail";
import { DayView } from "./views/day-view";
import { MonthView } from "./views/month-view";
import { WeekView } from "./views/week-view";

export function CalendarPage({ data, scope }: { data: CalendarPageDataDTO; scope?: string }) {
  return <SessionDetailProvider><CalendarPageContent data={data} scope={scope} /></SessionDetailProvider>;
}

function CalendarPageContent({ data, scope }: { data: CalendarPageDataDTO; scope?: string }) {
  const router = useRouter();
  const [fixtureView, setFixtureView] = useState<CalendarView>(data.view);
  const [fixtureDate, setFixtureDate] = useState(() => new Date(data.anchorDate));
  const view = data.fixture ? fixtureView : data.view;
  const anchorDate = data.fixture ? fixtureDate : new Date(data.anchorDate);
  const [dialog, setDialog] = useState<"new" | "detail" | null>(null);
  const [selectedOccurrence, setSelectedOccurrence] = useState<SessionOccurrenceTarget | null>(null);
  const detail = useSessionDetail(data.fixture ? null : selectedOccurrence);
  const periodLabel = formatCalendarPeriod(anchorDate, view);

  function navigate(date: string, nextView: CalendarView) {
    const query = new URLSearchParams({ date, view: nextView });
    if (scope) query.set("e2eScope", scope);
    router.push(`/calendar?${query}`, { scroll: false });
  }

  function shiftPeriod(direction: -1 | 1) {
    const shifted = shiftCalendarPeriod(anchorDate, view, direction);
    if (data.fixture) setFixtureDate(shifted);
    else navigate(shifted.toISOString().slice(0, 10), view);
  }

  function openEvent(event: CalendarVisualEventDTO) {
    setSelectedOccurrence({ seriesId: event.seriesId, originalStart: event.originalStart });
    setDialog("detail");
  }

  function closeDetail() {
    setDialog(null);
    setSelectedOccurrence(null);
    if (!data.fixture) router.refresh();
  }

  const session = data.fixture ? sessionDetailFixture : detail.data?.detail;

  return (
    <div className="flex h-[calc(100vh-24px)] min-h-[680px] flex-col overflow-hidden">
      <CalendarHeader
        greetingName={data.greetingName}
        onShift={shiftPeriod}
        onNewSession={() => setDialog("new")}
        onViewChange={nextView => data.fixture ? setFixtureView(nextView) : navigate(data.date, nextView)}
        periodLabel={periodLabel}
        view={view}
      />
      {view === "week" ? <WeekView days={data.weekDays} onOpenEvent={openEvent} /> : null}
      {view === "day" ? <DayView onOpenEvent={openEvent} sections={data.daySections} /> : null}
      {view === "month" ? (
        <MonthView cells={data.monthCells} label={periodLabel} />
      ) : null}
      {dialog === "new" ? <NewSessionModal onClose={() => setDialog(null)} subjects={data.subjects} timeZone={data.timeZone} /> : null}
      {dialog === "detail" && !data.fixture && detail.isPending ? (
        <p className="sr-only" role="status">Loading session details.</p>
      ) : null}
      {dialog === "detail" && detail.error && !session ? (
        <p className="text-sm font-semibold text-red-400" role="alert">
          {detail.error.message}{" "}
          <button className="underline" onClick={() => detail.refetch()} type="button">Try again</button>
        </p>
      ) : null}
      {dialog === "detail" && session ? (
        <SessionDetailsModal
          onClose={closeDetail}
          session={session}
          subjects={data.subjects}
          timeZone={data.fixture ? data.timeZone : detail.data!.timeZone}
        />
      ) : null}
    </div>
  );
}
