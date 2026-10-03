"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dashboardFixture } from "@/fixtures";
import type { DashboardFixtureDTO } from "@/domain/dto";
import { TaskDetailProvider, useTaskDetail } from "@/features/tasks/use-task-detail";
import { TaskDetailsModal } from "@/features/tasks/task-details-modal";

import { DashboardHeader } from "./dashboard-header";
import { MiniCalendar } from "./mini-calendar";
import { SummaryCards } from "./summary-cards";
import { TaskProgress } from "./task-progress";
import { TodayClasses } from "./today-classes";
import { UpcomingAssignments } from "./upcoming-assignments";

export function Dashboard({ dashboard = dashboardFixture }: { dashboard?: DashboardFixtureDTO }) {
  return <TaskDetailProvider><DashboardContent dashboard={dashboard} /></TaskDetailProvider>;
}

function DashboardContent({ dashboard }: { dashboard: DashboardFixtureDTO }) {
  const router = useRouter();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const detail = useTaskDetail(selectedTaskId, (updated, id) => {
    if (!updated && selectedTaskId === id) setSelectedTaskId(null);
    // Recompute summary, assignments, today's tasks and calendar markers from the same domain.
    router.refresh();
  });
  function openTask(id: string) {
    detail.mutation.reset();
    setSelectedTaskId(id);
  }
  const error = detail.query.error?.message ?? detail.mutation.error?.message;
  return (
    <div className="min-h-full space-y-8 overflow-y-auto p-4 sm:p-6 xl:p-8">
      <DashboardHeader />
      <SummaryCards dashboard={dashboard} />
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div className="space-y-8 xl:col-span-2">
          <UpcomingAssignments assignments={dashboard.assignments} onOpen={openTask} />
          <TaskProgress completed={dashboard.taskSummary.completedToday} tasks={dashboard.tasks}
            onOpen={openTask} pending={detail.mutation.isPending}
            onToggle={task => detail.mutate({ type: task.completed ? "reopen" : "complete" }, task.id)} />
        </div>
        <div className="space-y-8">
          <TodayClasses classes={dashboard.todayClasses} />
          <MiniCalendar calendar={dashboard.calendar} />
        </div>
      </div>
      {error && !detail.query.data?.detail ? <p className="text-sm font-semibold text-red-400" role="alert">{error}</p> : null}
      {selectedTaskId && detail.query.isPending ? <p className="sr-only" role="status">Loading task details.</p> : null}
      {selectedTaskId && detail.query.data?.detail ? <TaskDetailsModal key={selectedTaskId}
        detail={detail.query.data.detail} now={detail.query.data.now} timeZone={detail.query.data.timeZone}
        pending={detail.mutation.isPending} error={detail.mutation.error?.message ?? null}
        onMutate={detail.mutate} onClose={() => setSelectedTaskId(null)} /> : null}
    </div>
  );
}
