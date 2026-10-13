import { readFile } from "node:fs/promises";
// @ts-expect-error TS5097: Node 24 native TypeScript requires the real extension.
import { summarize } from "./metrics.ts";

type Resource = { kind: string; start: number; headers?: number; end?: number; failed?: boolean; providerRequestId?: string };
type Sample = { destination: string; input: string; mode: string; click: number; domReady: number; feedback: number; frameAfterReady: number; firstPaint: number | null; resources: Resource[]; longTasks: { duration: number }[]; scriptEvaluationMs: number };
type Report = { complete: boolean; count: number; dataset: string; browser: string; date: string; origin: string; samples: Sample[] };
const providerRows = await readFile("test-results/performance/provider-calls.jsonl", "utf8").then(text => text.trim().split("\n").map(line => JSON.parse(line) as { requestId: string; kind: string })).catch(() => []);
for (const name of process.argv.slice(2)) {
  if (!/^(local-|hosted-)?(empty|populated)\.json$/.test(name)) throw new Error("Only generated profiling reports are accepted");
  const report = JSON.parse(await readFile(`test-results/performance/${name}`, "utf8")) as Report;
  const groups = new Map<string, Sample[]>();
  for (const sample of report.samples) {
    const key = `${sample.destination}/${sample.input}/${sample.mode}`;
    groups.set(key, [...(groups.get(key) ?? []), sample]);
  }
  console.log(JSON.stringify({ file: name, complete: report.complete, count: report.count, dataset: report.dataset, browser: report.browser, date: report.date, samples: report.samples.length, groups: [...groups].map(([scenario, samples]) => {
    // The first observed RSC is descriptive only: not a guaranteed critical stream.
    const streams = samples.map(s => s.resources.find(r => r.kind === "rsc" && r.start >= s.click));
    const id = (sample: Sample) => sample.resources.find(r => r.kind === "rsc" && r.start >= sample.click)?.providerRequestId;
    const countCalls = (sample: Sample, kind: string) => providerRows.filter(row => row.requestId === id(sample) && row.kind === kind).length;
    return { scenario, feedback: summarize(samples.map(s => s.feedback - s.click)), contentFrame: summarize(samples.map(s => s.frameAfterReady - s.click)), firstRscHeaders: summarize(streams.flatMap((r, i) => r?.headers === undefined ? [] : [r.headers - samples[i].click])), bodyCompleteSamples: streams.filter(r => r?.end !== undefined && !r.failed).length, paintAfterDomReady: summarize(samples.flatMap(s => s.firstPaint === null ? [] : [s.firstPaint - s.domReady])), evaluation: summarize(samples.map(s => s.scriptEvaluationMs)), maxLongTask: Math.max(0, ...samples.flatMap(s => s.longTasks.map(t => t.duration))), providerCounts: report.origin.includes("localhost") ? { profile: summarize(samples.map(s => countCalls(s, "profile"))), authUser: summarize(samples.map(s => countCalls(s, "auth-user"))) } : null };
  }) }));
}
