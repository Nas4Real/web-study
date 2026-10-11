"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { dashboardFixture, sessionDetailFixture } from "@/fixtures";
import type { DashboardFixtureDTO } from "@/domain/dto";
import { SessionDetailsModal } from "@/features/calendar/session-details-modal";
import { useSessionDetail } from "@/features/calendar/use-session-detail";
import type { SessionOccurrenceTarget } from "@/server/study/session-detail-service";
import { TaskDetailProvider, useTaskDetail } from "@/features/tasks/use-task-detail";
import { TaskDetailsModal } from "@/features/tasks/task-details-modal";
import { NewTaskModal } from "@/features/tasks/new-task-modal";

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
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
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
    // Server Actions revalidate this page; discard pre-write sibling details.
    if (selectedSession) queryClient.removeQueries({ queryKey: ["session-detail", selectedSession.seriesId] });
    closeSession();
  }
  const error = detail.query.error?.message ?? detail.mutation.error?.message;
  const session = dashboard.fixture && selectedSession ? sessionDetailFixture : sessionDetail.data?.detail;
  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-8 sm:pt-10">
        <div className="mx-auto flex h-full max-w-[1200px] flex-col gap-8">
          <DashboardHeader onOpenNewTask={() => setNewTaskOpen(true)} />
          <SummaryCards dashboard={dashboard} />
          <div className="grid h-full grid-cols-1 items-start gap-6 lg:grid-cols-12">
            <div className="flex min-w-0 flex-col gap-8 lg:col-span-7">
              <UpcomingAssignments assignments={dashboard.assignments} onOpen={openTask} />
              <TaskProgress completed={dashboard.taskSummary.completedToday} tasks={dashboard.tasks}
                onOpen={openTask} pending={detail.mutation.isPending}
                onToggle={task => detail.mutate({ type: task.completed ? "reopen" : "complete" }, task.id)} />
            </div>
            <div className="flex min-w-0 flex-col gap-6 lg:col-span-5">
              <TodayClasses
                classes={dashboard.todayClasses}
                onOpen={item => setSelectedSession({ seriesId: item.seriesId, originalStart: item.originalStart })}
              />
              <MiniCalendar calendar={dashboard.calendar} />
            </div>
          </div>
        </div>
      </div>
      {newTaskOpen ? <NewTaskModal subjects={dashboard.subjects} onClose={() => { setNewTaskOpen(false); router.refresh(); }} /> : null}
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
