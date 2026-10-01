"use client";

import { useState } from "react";

import type { CalendarView } from "@/domain/dto";
import { calendarViewFixture } from "@/fixtures";

import { CalendarHeader } from "./calendar-header";
import { formatCalendarPeriod, shiftCalendarPeriod } from "./calendar-period";
import { DayView } from "./views/day-view";
import { MonthView } from "./views/month-view";
import { WeekView } from "./views/week-view";

export function CalendarPage() {
  const [view, setView] = useState<CalendarView>("week");
  const [anchorDate, setAnchorDate] = useState(() => new Date(calendarViewFixture.anchorDate));
  const periodLabel = formatCalendarPeriod(anchorDate, view);

  function shiftPeriod(direction: -1 | 1) {
    setAnchorDate((current) => shiftCalendarPeriod(current, view, direction));
  }

  return (
    <div className="flex h-[calc(100vh-24px)] min-h-[680px] flex-col overflow-hidden">
      <CalendarHeader
        greetingName={calendarViewFixture.greetingName}
        onShift={shiftPeriod}
        onViewChange={setView}
        periodLabel={periodLabel}
        view={view}
      />
      {view === "week" ? <WeekView days={calendarViewFixture.weekDays} /> : null}
      {view === "day" ? <DayView sections={calendarViewFixture.daySections} /> : null}
      {view === "month" ? (
        <MonthView cells={calendarViewFixture.monthCells} label={periodLabel} />
      ) : null}
    </div>
  );
}
