import { dashboardFixture } from "@/fixtures";

import { DashboardHeader } from "./dashboard-header";
import { MiniCalendar } from "./mini-calendar";
import { SummaryCards } from "./summary-cards";
import { TaskProgress } from "./task-progress";
import { TodayClasses } from "./today-classes";
import { UpcomingAssignments } from "./upcoming-assignments";

export function Dashboard() {
  return (
    <div className="min-h-full space-y-8 overflow-y-auto p-4 sm:p-6 xl:p-8">
      <DashboardHeader />
      <SummaryCards dashboard={dashboardFixture} />
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div className="space-y-8 xl:col-span-2">
          <UpcomingAssignments assignments={dashboardFixture.assignments} />
          <TaskProgress completed={dashboardFixture.taskSummary.completedToday} tasks={dashboardFixture.tasks} />
        </div>
        <div className="space-y-8">
          <TodayClasses classes={dashboardFixture.todayClasses} />
          <MiniCalendar calendar={dashboardFixture.calendar} />
        </div>
      </div>
    </div>
  );
}
