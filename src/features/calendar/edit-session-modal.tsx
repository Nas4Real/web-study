"use client";

import { CalendarDays, Check, GripVertical, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";

import { ModalFrame } from "@/components/modal-frame";
import type { CalendarOccurrenceDetailDTO } from "@/domain/dto";
import { editSessionAction } from "@/server/study/calendar-actions";

import styles from "./new-session-modal.module.css";
import { SessionRecurrenceFields, type SessionRecurrenceValue } from "./session-recurrence-fields";
import type { SessionMutationScope } from "./session-mutation-scope-modal";

const durationLabels: Record<number, string> = { 30: "30 minutes", 45: "45 minutes", 60: "1 hour", 90: "1 hr 30 min", 120: "2 hours", 180: "3 hours" };

function civilParts(value: string, timeZone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(new Date(value)).map(part => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function parseRecurrence(rule: string | null, timeZone: string): SessionRecurrenceValue {
  if (!rule) return { frequency: "none" };
  const values = Object.fromEntries(rule.split(";").map(part => part.split("=", 2)));
  const frequency = values.FREQ?.toLowerCase();
  if (frequency !== "daily" && frequency !== "weekly" && frequency !== "monthly") return { frequency: "none" };
  const count = values.COUNT ? Number(values.COUNT) : undefined;
  const compactUntil = values.UNTIL?.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  const until = compactUntil
    ? civilParts(`${compactUntil[1]}-${compactUntil[2]}-${compactUntil[3]}T${compactUntil[4]}:${compactUntil[5]}:${compactUntil[6]}Z`, timeZone).date
    : undefined;
  return {
    frequency,
    interval: Number(values.INTERVAL ?? 1),
    weekdays: values.BYDAY?.split(","),
    end: count ? "count" : until ? "date" : "never",
    count,
    until,
  };
}

function recurrenceFrom(formData: FormData) {
  const frequency = String(formData.get("repeatFrequency")) as SessionRecurrenceValue["frequency"];
  if (frequency === "none") return { frequency };
  const end = String(formData.get("repeatEnd")) as "never" | "date" | "count";
  return {
    frequency,
    interval: Number(formData.get("repeatInterval")),
    ...(frequency === "weekly" ? { weekdays: formData.getAll("repeatWeekday").map(String) } : {}),
    end,
    ...(end === "count" ? { count: Number(formData.get("repeatCount")) } : {}),
    ...(end === "date" ? { until: String(formData.get("repeatUntil")) } : {}),
  };
}

function scopeSummary(session: CalendarOccurrenceDetailDTO, scope: SessionMutationScope, timeZone: string) {
  if (!session.isRecurring) return "This session will be updated.";
  if (scope === "series") return "All sessions in this series will be updated.";
  const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone, weekday: "long" }).format(new Date(session.startsAt));
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", minute: "2-digit", timeZone }).format(new Date(session.startsAt));
  return `${date} at ${time}. Other sessions in the series stay unchanged.`;
}

export function EditSessionModal({ onCancel, onSaved, scope, session, subjects, timeZone }: {
  onCancel: () => void;
  onSaved: () => void;
  scope: SessionMutationScope;
  session: CalendarOccurrenceDetailDTO;
  subjects: readonly Readonly<{ id: string; name: string }>[];
  timeZone: string;
}) {
  const start = civilParts(session.startsAt, timeZone);
  const duration = Math.round((new Date(session.endsAt).getTime() - new Date(session.startsAt).getTime()) / 60_000);
  const durationOptions = durationLabels[duration]
    ? Object.entries(durationLabels)
    : [...Object.entries(durationLabels), [String(duration), `${duration} minutes`]].sort(([left], [right]) => Number(left) - Number(right));
  const [notes, setNotes] = useState(() => session.notesItems.map(item => item.text));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const titleLabel = session.kind === "university" ? "Class or Lecture Name" : session.kind === "revision" ? "Session title" : "Exam title";
  const subjectOptions = subjects.some(subject => subject.id === session.subject.id)
    ? subjects
    : [session.subject, ...subjects];

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const common = {
      date: String(formData.get("date")),
      durationMinutes: session.kind === "exam" ? null : Number(formData.get("durationMinutes")),
      focusText: session.kind === "revision" ? String(formData.get("focusText") ?? "") : null,
      location: session.kind === "revision" ? null : String(formData.get("location") ?? ""),
      notesItems: formData.getAll("notesItem").map(String),
      professor: session.kind === "university" ? String(formData.get("professor") ?? "") : null,
      startTime: String(formData.get("startTime")),
      title: String(formData.get("title")),
    };
    const input = scope === "series"
      ? {
          scope,
          seriesId: session.seriesId,
          changes: {
            ...common,
            recurrence: recurrenceFrom(formData),
            subjectId: String(formData.get("subjectId")),
          },
        }
      : { scope, seriesId: session.seriesId, originalStart: session.originalStart, changes: common };

    setError(null);
    startTransition(async () => {
      try {
        const result = await editSessionAction(input);
        if (result.status === "success") onSaved();
        else setError(result.message);
      } catch {
        setError("Sessions are temporarily unavailable. Please try again.");
      }
    });
  }

  return (
    <ModalFrame
      closeClass="right-4 top-5 size-10 border-[#303034] bg-[#171719] text-zinc-300 hover:bg-[#232326] sm:right-6 [&>svg]:size-5"
      closeDisabled={pending}
      descriptionId="edit-session-description"
      labelId="edit-session-title"
      onClose={onCancel}
      overlayClass="!z-[100] bg-black/75 p-[9px] backdrop-blur-sm sm:p-4"
      panelClass="max-h-full !overflow-y-auto rounded-2xl border-[#2a2a2e] bg-[#101012] shadow-2xl"
      widthClass="max-w-[620px]"
    >
      <header className="flex items-start gap-3 border-b border-[#27272a] px-4 py-5 pr-20 sm:px-6">
        <span className="mt-0.5 flex size-12 shrink-0 items-center justify-center rounded-xl border border-[#303034] bg-[#1a1a1d] text-zinc-100"><CalendarDays aria-hidden="true" size={22} /></span>
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-zinc-400">Calendar</p>
          <h2 className="mt-1 text-[22px] font-bold tracking-tight text-white" id="edit-session-title">Edit session</h2>
          <p className="mt-1 text-[14px] leading-5 text-zinc-300" id="edit-session-description">Update the details for this {session.kind} session.</p>
        </div>
      </header>
      <form aria-busy={pending} onSubmit={submit}>
        <fieldset className="space-y-5 px-4 py-5 sm:px-6" disabled={pending}>
          <div className="rounded-xl border border-[#303034] bg-[#171719] px-4 py-3.5">
            <p className="flex items-center gap-2 text-[14px] font-bold text-white"><span aria-hidden="true">↪</span>{!session.isRecurring ? "Editing this session" : scope === "occurrence" ? "Editing this session only" : "Editing entire series"}</p>
            <p className="mt-1 pl-6 text-[12px] leading-5 text-zinc-400">{scopeSummary(session, scope, timeZone)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-[#303034] bg-[#18181b] px-3 py-1 text-[12px] font-bold text-zinc-200"><span className="mr-2 text-emerald-400">●</span>{session.subject.name}</span>
            <span className="rounded-full border border-[#303034] bg-[#18181b] px-3 py-1 text-[12px] font-bold capitalize text-zinc-200">{session.kind}</span>
          </div>
          <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 [&>div]:min-w-0">
            <div className="sm:col-span-2">
              <label className={styles.label} htmlFor="edit-session-title-input">{titleLabel}</label>
              <input className={styles.input} defaultValue={session.title} id="edit-session-title-input" maxLength={240} name="title" required />
            </div>
            {scope === "series" ? <div className="sm:col-span-2">
              <label className={styles.label} htmlFor="edit-session-subject">Subject</label>
              <select className={styles.input} defaultValue={session.subject.id} id="edit-session-subject" name="subjectId" required>{subjectOptions.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select>
            </div> : null}
            <div>
              <label className={styles.label} htmlFor="edit-session-date">Date</label>
              <input className={styles.input} defaultValue={start.date} id="edit-session-date" name="date" required type="date" />
            </div>
            <div>
              <label className={styles.label} htmlFor="edit-session-start">Start time</label>
              <input className={styles.input} defaultValue={start.time} id="edit-session-start" name="startTime" required type="time" />
            </div>
            {session.kind !== "exam" ? <div>
              <label className={styles.label} htmlFor="edit-session-duration">Duration</label>
              <select className={styles.input} defaultValue={String(duration)} id="edit-session-duration" name="durationMinutes">{durationOptions.map(([minutes, label]) => <option key={minutes} value={minutes}>{label}</option>)}</select>
            </div> : null}
            {session.kind !== "revision" ? <div>
              <label className={styles.label} htmlFor="edit-session-location">Room / Location <span className="font-normal text-zinc-500">— optional</span></label>
              <input className={styles.input} defaultValue={session.location ?? ""} id="edit-session-location" maxLength={500} name="location" />
            </div> : null}
            {session.kind === "university" ? <div className="sm:col-span-2">
              <label className={styles.label} htmlFor="edit-session-professor">Professor <span className="font-normal text-zinc-500">— optional</span></label>
              <input className={styles.input} defaultValue={session.professor ?? ""} id="edit-session-professor" maxLength={500} name="professor" />
            </div> : null}
            {session.kind === "revision" ? <div className="sm:col-span-2">
              <label className={styles.label} htmlFor="edit-session-focus">Focus or chapter <span className="font-normal text-zinc-500">— optional</span></label>
              <input className={styles.input} defaultValue={session.focusText ?? ""} id="edit-session-focus" maxLength={1000} name="focusText" />
            </div> : null}
          </div>
          <section className="border-t border-[#27272a] pt-5">
            <div className="flex items-center justify-between gap-3">
              <div><h3 className="text-[14px] font-bold text-white">Notes &amp; Reminders</h3><p className="mt-1 text-[11px] text-zinc-500">Keep these in the order you need them.</p></div>
              <button className="flex items-center gap-1.5 rounded-lg border border-[#343438] bg-[#171719] px-3 py-2 text-[12px] font-bold text-white hover:bg-[#222225]" onClick={() => setNotes(items => [...items, ""])} type="button"><Plus aria-hidden="true" size={14} />Add item</button>
            </div>
            <div className="mt-3 space-y-2">
              {notes.map((note, index) => <div className="flex items-center gap-2" key={index}>
                <GripVertical aria-hidden="true" className="shrink-0 text-zinc-600" size={16} />
                <span className="w-5 shrink-0 text-center text-[12px] font-bold text-zinc-500">{index + 1}</span>
                <input aria-label={`Note ${index + 1}`} className={styles.input} maxLength={500} name="notesItem" onChange={event => setNotes(items => items.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} required value={note} />
                <button aria-label={`Remove note ${index + 1}`} className="grid size-10 shrink-0 place-items-center rounded-lg text-zinc-500 hover:bg-[#202023] hover:text-red-400" onClick={() => setNotes(items => items.filter((_, itemIndex) => itemIndex !== index))} type="button"><Trash2 aria-hidden="true" size={15} /></button>
              </div>)}
            </div>
          </section>
          {scope === "series" ? <SessionRecurrenceFields date={start.date} initialValue={parseRecurrence(session.recurrenceRule, timeZone)} timeZone={timeZone} /> : null}
          {error ? <p className="text-[13px] text-red-300" role="alert">{error}</p> : null}
        </fieldset>
        <footer className="sticky bottom-0 flex flex-col items-stretch gap-3 border-t border-[#27272a] bg-[#101012] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="text-[12px] font-medium text-zinc-400">{!session.isRecurring ? "This session will be updated." : scope === "occurrence" ? "Only this occurrence will be updated." : "The entire series will be updated."}</span>
          <div className="flex justify-end gap-2">
            <button className="rounded-lg border border-[#343438] bg-[#171719] px-4 py-2.5 text-[14px] font-bold text-white hover:bg-[#222225] disabled:opacity-50" disabled={pending} onClick={onCancel} type="button">Cancel</button>
            <button className="flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2.5 text-[14px] font-bold text-black hover:bg-white disabled:opacity-60" disabled={pending} type="submit">{pending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={15} /> : <Check aria-hidden="true" size={15} />}{pending ? "Saving..." : "Save changes"}</button>
          </div>
        </footer>
      </form>
    </ModalFrame>
  );
}
