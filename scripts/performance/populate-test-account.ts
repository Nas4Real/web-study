import { chromium } from "@playwright/test";

const origin = process.env.PERF_ORIGIN ?? "https://web-study-pearl.vercel.app";
if (!["https://web-study-pearl.vercel.app", "http://localhost:3100"].includes(origin)) throw new Error("Unapproved fixture origin");
const email = process.env.PERF_POPULATED_EMAIL;
const password = process.env.PERF_POPULATED_PASSWORD;
if (!email?.startsWith("codex.perf.populated.") || !password) throw new Error("Dedicated populated test credentials required");
const browser = await chromium.launch();
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${origin}/sign-in`);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await page.getByRole("heading", { name: "Overview", exact: true }).waitFor();
  async function get(path: string) {
    const response = await context.request.get(`${origin}/api/v1/${path}`);
    if (!response.ok()) throw new Error(`Fixture read failed: ${response.status()}`);
    return response.json();
  }
  async function post(path: string, data: object) {
    const response = await context.request.post(`${origin}/api/v1/${path}`, { data, headers: { Origin: origin } });
    if (!response.ok()) throw new Error(`Fixture creation failed: ${path}, ${response.status()}`);
    return response.json();
  }
  // Additive/idempotent within this one test account; never delete existing data.
  const subjects = (await get("subjects?limit=100")).data as { id: string; name: string }[];
  const subjectIds: string[] = [];
  for (let i = 0; i < 3; i++) {
    const name = `Performance subject ${i + 1}`;
    const subject = subjects.find((s) => s.name === name) ?? await post("subjects", { name, color: ["#4ade80", "#facc15", "#60a5fa"][i], position: i });
    subjectIds.push(subject.id);
  }
  const tasks = (await get("tasks?limit=100")).data as { title: string }[];
  for (let i = 0; i < 20; i++) {
    const title = `Performance task ${i + 1}`;
    if (!tasks.some((t) => t.title === title)) await post("tasks", { title, subject_id: subjectIds[i % 3], priority: i % 4 === 0 ? "high" : "normal", due_at: `2026-10-${String(10 + i % 5).padStart(2, "0")}T15:00:00Z`, description: "Synthetic profiling data", subtasks: [{ title: "First step" }, { title: "Second step" }] });
  }
  const sessions = await get("sessions?from=2026-10-10T00:00:00Z&to=2026-10-17T00:00:00Z") as { title: string }[];
  for (let i = 0; i < 8; i++) {
    const title = `Performance session ${i + 1}`;
    if (!sessions.some((s) => s.title === title)) await post("sessions", { title, subject_id: subjectIds[i % 3], kind: "university", starts_at: `2026-10-${String(10 + i % 4).padStart(2, "0")}T${String(8 + i).padStart(2, "0")}:00:00Z`, duration_minutes: 60, timezone: "Africa/Tunis", notes_items: ["Synthetic reminder"], recurrence_rule: i === 0 ? "FREQ=WEEKLY;COUNT=4" : null });
  }
  console.log("Populated dedicated account: 3 subjects, 20 tasks/40 subtasks, 8 session series. No real-user data changed. Chapters excluded: separate hosted 503 issue observed.");
} finally { await browser.close(); }
