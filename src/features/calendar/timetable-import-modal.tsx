"use client";

import { CheckCircle2, FileJson, LoaderCircle, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { ModalFrame } from "@/components/modal-frame";
import type { TimetableImportResult, TimetableIssue } from "@/domain/timetable-import";
import { readTimetableFile, submitTimetable, type LoadedTimetable } from "./timetable-import-client";

const secondary = "rounded-lg border border-border-hover bg-card-hover px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-border-panel disabled:opacity-50";
const primary = "rounded-lg bg-zinc-100 px-4 py-2.5 text-[13px] font-bold text-black transition-colors hover:bg-white disabled:opacity-50";

export function TimetableImportModal({ subjects, onClose, onImported, onViewCalendar }: {
  subjects: readonly { id: string; name: string }[];
  onClose: () => void;
  onImported: (result: TimetableImportResult) => void;
  onViewCalendar: (result: TimetableImportResult) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  const busy = useRef(false);
  const [loaded, setLoaded] = useState<LoadedTimetable | null>(null);
  const [issues, setIssues] = useState<TimetableIssue[]>([]);
  const [reading, setReading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TimetableImportResult | null>(null);
  const subjectNames = new Map(subjects.map(subject => [subject.id, subject.name]));
  const close = () => { if (!busy.current) { generation.current += 1; onClose(); } };

  async function choose(file: File) {
    if (busy.current) return;
    const version = ++generation.current;
    setLoaded(null); setIssues([]); setError(null); setReading(true);
    const parsed = await readTimetableFile(file);
    if (version !== generation.current) return;
    setReading(false);
    if (parsed.success) setLoaded(parsed.data);
    else setIssues(parsed.issues);
  }

  async function confirm() {
    if (!loaded || busy.current || reading || result) return;
    busy.current = true; setPending(true); setError(null);
    let saved: TimetableImportResult;
    try { saved = await submitTimetable(loaded.text); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to import. Retry the same file safely."); setPending(false); busy.current = false; return; }
    setResult(saved); setPending(false); busy.current = false;
    onImported(saved);
  }

  return (
    <ModalFrame labelId="timetable-import-title" descriptionId="timetable-import-description" returnFocusId="calendar-import-button"
      onClose={close} closeDisabled={pending} panelClass="max-h-[calc(100dvh-32px)] !overflow-y-auto rounded-2xl border-border-hover bg-card shadow-2xl"
      footer={result ? <>
        <button className={secondary} onClick={close} type="button">Close</button>
        <button className={primary} onClick={() => onViewCalendar(result)} type="button">View Calendar</button>
      </> : <>
        <button className={secondary} disabled={pending} onClick={close} type="button">Cancel</button>
        <button className={`${primary} inline-flex items-center gap-2`} disabled={!loaded || reading || pending} onClick={confirm} type="button">
          {pending ? <><LoaderCircle aria-hidden="true" className="animate-spin" size={15} />Importing…</> : "Import sessions"}
        </button>
      </>}
    >
      <header className="border-b border-border-panel px-6 py-6 pr-16">
        <div className="mb-3 flex size-11 items-center justify-center rounded-xl border border-border-panel bg-card-hover text-zinc-200"><FileJson aria-hidden="true" size={22} /></div>
        <h2 className="text-[22px] font-bold tracking-tight text-white" id="timetable-import-title">Import timetable</h2>
        <p className="mt-2 text-[13px] leading-5 text-text-muted" id="timetable-import-description">Add classes, exams, and revision sessions from JSON. Existing sessions are kept.</p>
      </header>
      <div className="space-y-5 px-6 py-5" aria-busy={pending || reading}>
        {result ? <section className="rounded-xl border border-border-panel bg-card-hover p-5" role="status">
          <CheckCircle2 aria-hidden="true" className="mb-3 text-emerald-400" size={24} />
          <h3 className="font-semibold text-white">{result.alreadyImported ? "Already imported" : "Timetable imported"}</h3>
          <p className="mt-2 text-[13px] leading-5 text-text-muted">{result.alreadyImported ? "This timetable was imported before. No duplicate sessions were added." : `${result.sessionCount} session series added · ${result.subjectsCreated} new ${result.subjectsCreated === 1 ? "subject" : "subjects"}.`}</p>
          <p className="mt-2 text-[12px] text-text-muted">Open Calendar at {result.firstDate} to see your timetable.</p>
        </section> : <>
          <div className="rounded-xl border border-dashed border-border-hover bg-card-hover p-5">
            <input accept=".json,application/json" aria-label="JSON timetable file" className="sr-only" disabled={pending} onChange={event => {
              const file = event.currentTarget.files?.[0]; event.currentTarget.value = "";
              if (file) void choose(file);
            }} ref={input} type="file" />
            <button className={`${secondary} inline-flex items-center gap-2`} disabled={pending} onClick={() => input.current?.click()} type="button"><Upload aria-hidden="true" size={15} />Choose JSON file</button>
            <p className="mt-3 break-all text-[13px] text-zinc-300">{loaded?.fileName ?? "No file selected"}</p>
            <p className="mt-1 text-[12px] text-text-muted">Up to 1 MiB · 200 session series · JSON version 1</p>
          </div>
          <a className="inline-block text-[13px] font-medium text-zinc-200 underline underline-offset-4 hover:text-white" download href="/examples/timetable.json">Download example JSON</a>
          <p className="text-[12px] leading-5 text-text-muted">Nothing is saved until you confirm. Subject names reuse your existing subjects; new names are created. The same timetable can be retried without duplicates.</p>
          {reading ? <p className="text-[13px] text-zinc-300" role="status">Reading and validating your file…</p> : null}
          {issues.length ? <section className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-[13px] text-red-300" role="alert">
            <h3 className="mb-2 font-semibold">Check your JSON file</h3>
            <ul className="list-disc space-y-1 pl-4">{issues.map((issue, index) => <li className="break-words" key={index}>{issue.path.length ? `${issue.path.join(".")}: ` : ""}{issue.message}</li>)}</ul>
          </section> : null}
          {loaded ? <section>
            <h3 className="text-[14px] font-semibold text-white">Preview · {loaded.document.sessions.length} session series</h3>
            <p className="mt-1 text-[12px] text-text-muted">Timezone: {loaded.document.timezone}. Recurring series expand into occurrences in Calendar.</p>
            <div className="mt-3 max-h-60 overflow-auto rounded-lg border border-border-panel">
              <ul className="divide-y divide-border-panel">{loaded.document.sessions.map((session, index) => <li className="px-3 py-3" key={index}>
                <div className="flex items-start justify-between gap-3"><span className="break-words text-[13px] font-medium text-white">{session.title}</span><span className="shrink-0 text-[11px] capitalize text-text-muted">{session.kind}</span></div>
                <p className="mt-1 break-words text-[12px] text-text-muted">{session.subjectName ?? subjectNames.get(session.subjectId ?? "") ?? "Existing subject ID"} · {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: session.timezone }).format(new Date(session.startsAt))}{session.durationMinutes ? ` · ${session.durationMinutes} min` : ""}</p>
                {session.recurrenceRule ? <p className="mt-1 break-all text-[11px] text-text-muted">{session.recurrenceRule}</p> : null}
              </li>)}</ul>
            </div>
          </section> : null}
          {error ? <p className="whitespace-pre-line break-words rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-[13px] text-red-300" role="alert">{error}</p> : null}
          {pending ? <p className="text-[13px] text-zinc-300" role="status">Importing all sessions. Keep this window open…</p> : null}
        </>}
      </div>
    </ModalFrame>
  );
}
