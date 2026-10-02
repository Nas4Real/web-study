import { TasksPage } from "@/features/tasks/tasks-page";
import { toTaskListViewModel } from "@/features/tasks/task-view-model";
import { loadTaskPageData } from "@/server/study/task-page-loader";

export default async function TasksRoute() {
  const data = await loadTaskPageData();
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
      key={tasks.map(({ id, status }) => `${id}:${status}`).join("|")}
      subjects={data.subjects.map(({ id, name }) => ({ id, name }))}
    />
  );
}
