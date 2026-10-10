"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dashboardFixture, sessionDetailFixture } from "@/fixtures";
import type { DashboardFixtureDTO } from "@/domain/dto";
import { SessionDetailsModal } from "@/features/calendar/session-details-modal";
import { useSessionDetail } from "@/features/calendar/use-session-detail";
import type { SessionOccurrenceTarget } from "@/server/study/session-detail-service";
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
  const [selectedSession, setSelectedSession] = useState<SessionOccurrenceTarget | null>(null);
  const sessionDetail = useSessionDetail(dashboard.fixture ? null : selectedSession);
  const detail = useTaskDetail(selectedTaskId, (updated, id) => {
    if (!updated && selectedTaskId === id) setSelectedTaskId(null);
    // Recompute summary, assignments, today's tasks and calendar markers from the same domain.
    router.refresh();
  });
  function openTask(id: string) {
    detail.mutation.reset();
    setSelectedTaskId(id);
  }
  function closeSession() {
    setSelectedSession(null);
  }
  function finishSessionMutation() {
    closeSession();
    if (!dashboard.fixture) router.refresh();
  }
  const error = detail.query.error?.message ?? detail.mutation.error?.message;
  const session = dashboard.fixture && selectedSession ? sessionDetailFixture : sessionDetail.data?.detail;
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
          <TodayClasses
            classes={dashboard.todayClasses}
            onOpen={item => setSelectedSession({ seriesId: item.seriesId, originalStart: item.originalStart })}
          />
          <MiniCalendar calendar={dashboard.calendar} />
        </div>
      </div>
      {error && !detail.query.data?.detail ? <p className="text-sm font-semibold text-red-400" role="alert">{error}</p> : null}
      {selectedTaskId && detail.query.isPending ? <p className="sr-only" role="status">Loading task details.</p> : null}
      {selectedTaskId && detail.query.data?.detail ? <TaskDetailsModal key={selectedTaskId}
        detail={detail.query.data.detail} now={detail.query.data.now} timeZone={detail.query.data.timeZone}
        pending={detail.mutation.isPending} error={detail.mutation.error?.message ?? null}
        onMutate={detail.mutate} onClose={() => setSelectedTaskId(null)} /> : null}
      {selectedSession && !dashboard.fixture && sessionDetail.isPending ? (
        <p className="sr-only" role="status">Loading session details.</p>
      ) : null}
      {selectedSession && sessionDetail.error && !session ? (
        <p className="text-sm font-semibold text-red-400" role="alert">
          {sessionDetail.error.message}{" "}
          <button className="underline" onClick={() => sessionDetail.refetch()} type="button">Try again</button>
        </p>
      ) : null}
      {selectedSession && session ? (
        <SessionDetailsModal
          onClose={closeSession}
          onMutated={finishSessionMutation}
          invokerFocusId={`session-open-${selectedSession.seriesId}:${selectedSession.originalStart}`}
          session={session}
          subjects={dashboard.subjects}
          timeZone={dashboard.fixture ? dashboard.timeZone : sessionDetail.data!.timeZone}
        />
      ) : null}
    </div>
  );
}
