const dashboard = { label: "Dashboard", path: "/", ready: 'main [aria-label="Today\'s summary"]' };
const tasks = { label: "Tasks", path: "/tasks", ready: 'main [aria-label="Task status"]' };
const documents = { label: "Documents", path: "/documents", ready: 'main [aria-label="Uploads are unavailable until storage is connected"]' };
const destinations = [
  dashboard,
  tasks,
  { label: "Calendar", path: "/calendar", ready: 'main [aria-label="Calendar view"]' },
  documents,
  { label: "Settings", path: "/settings", ready: "main #subjects" },
];

// Diagnostic-only allowlist; labels are never turned into arbitrary paths.
export function getShellScenario(label: string) {
  const target = destinations.find(destination => destination.label === label);
  if (!target) throw new Error("Unknown profiling destination");
  return {
    target,
    source: target.path === tasks.path ? dashboard : tasks,
    interruption: target.path === documents.path ? tasks : documents,
  };
}
