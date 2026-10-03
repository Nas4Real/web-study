import { TasksPage } from "@/features/tasks/tasks-page";
import { toTaskListViewModel } from "@/features/tasks/task-view-model";
import { loadTaskPageData } from "@/server/study/task-page-loader";

export default async function TasksRoute({ searchParams }: { searchParams: Promise<{ e2eScope?: string }> }) {
  const data = await loadTaskPageData((await searchParams).e2eScope);
  const tasks = toTaskListViewModel(
    data.groups,
    data.subjects,
    data.timeZone,
    new Date(data.now),
  );
  return (
    <TasksPage
      initialErrorCode={data.errorCode}
      initialTasks={tasks}
      subjects={data.subjects.map(({ id, name }) => ({ id, name }))}
    />
  );
}
