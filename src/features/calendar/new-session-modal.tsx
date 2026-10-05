"use client";

import { BookOpenCheck, CalendarPlus, ClipboardCheck, GripVertical, LoaderCircle, Plus, School, Trash2 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { ModalFrame } from "@/components/modal-frame";
import type { CalendarSessionKind } from "@/domain/dto";
import type { CalendarActionState } from "@/server/study/calendar-action-handlers";
import { createSessionAction } from "@/server/study/calendar-actions";
import styles from "./new-session-modal.module.css";
import { SessionRecurrenceFields } from "./session-recurrence-fields";

const sessionTypes = [
  { id: "exam", label: "Exam", description: "Test or mock", icon: ClipboardCheck },
  { id: "university", label: "University", description: "Class or lecture", icon: School },
  { id: "revision", label: "Revision", description: "Solo study", icon: BookOpenCheck },
] as const;
const kindCopy = {
  exam: { title: "Exam title", placeholder: "e.g. Final Calculus Exam", helper: "An upcoming test, exam, or quiz." },
  university: { title: "Class or Lecture Name", placeholder: "e.g. Physics 101 Lecture", helper: "A scheduled class, lecture, or lab." },
  revision: { title: "Session title", placeholder: "e.g. Integrals — problem set", helper: "A focused block for studying on your own." },
};
const durations = { university: [45, 60, 90, 120], revision: [30, 60, 90, 120, 180] };
const durationLabels: Record<number, string> = { 30: "30 minutes", 45: "45 minutes", 60: "1 hour", 90: "1 hr 30 min", 120: "2 hours", 180: "3 hours" };
const initialState: CalendarActionState = { code: "IDLE", status: "idle" };

async function saveSession(previous: CalendarActionState, formData: FormData): Promise<CalendarActionState> {
  try { return await createSessionAction(previous, formData); }
  catch { return { code: "STORAGE_UNAVAILABLE", status: "error", message: "Sessions are temporarily unavailable. Please try again." }; }
}

export function NewSessionModal({ onClose, subjects, timeZone }: {
  onClose: () => void;
  subjects: readonly Readonly<{ id: string; name: string }>[];
  timeZone: string;
}) {
  const [state, formAction, pending] = useActionState(saveSession, initialState);
  const [kind, setKind] = useState<CalendarSessionKind>("university");
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [universityDuration, setUniversityDuration] = useState("45");
  const [revisionDuration, setRevisionDuration] = useState("90");
  const [location, setLocation] = useState("");
  const [professor, setProfessor] = useState("");
  const [focusText, setFocusText] = useState("");
  const [notes, setNotes] = useState<string[]>([]);
  const copy = kindCopy[kind];
  const close = () => { if (!pending) onClose(); };

  useEffect(() => { if (state.status === "success") onClose(); }, [onClose, state.status]);

  return (
    <ModalFrame
      closeClass="right-4 top-5 size-10 border-[#303034] bg-[#171719] text-zinc-300 hover:bg-[#232326] sm:right-6 [&>svg]:size-5"
      closeDisabled={pending}
      descriptionId="new-session-description"
      labelId="new-session-title"
      onClose={close}
      overlayClass="!z-[100] bg-black/75 p-4 backdrop-blur-sm"
      panelClass="max-h-full !overflow-y-auto rounded-2xl border-[#2a2a2e] bg-[#101012] shadow-2xl"
    >
      <header className="flex items-start justify-between gap-3 border-b border-[#27272a] px-4 py-5 sm:gap-4 sm:px-6">
        <div className="flex items-start gap-3 max-sm:min-w-0">
          <span className="mt-0.5 flex size-12 shrink-0 items-center justify-center rounded-xl border border-[#303034] bg-[#1a1a1d] text-zinc-100"><CalendarPlus aria-hidden="true" size={22} /></span>
          <div className="max-sm:min-w-0">
            <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-zinc-400">Calendar</p>
            <h2 className="mt-1 text-[22px] font-bold tracking-tight text-white" id="new-session-title">Add a session</h2>
            <p className="mt-1 text-[14px] leading-5 text-zinc-300" id="new-session-description">Choose a session type, then fill in the details.</p>
          </div>
        </div>
        <span aria-hidden="true" className="size-10 shrink-0" />
      </header>
      <form action={formAction} aria-busy={pending} id="new-session-form" onReset={event => event.preventDefault()}>
        <input name="kind" type="hidden" value={kind} />
        <fieldset className="space-y-5 px-4 py-5 sm:px-6" disabled={pending}>
          <div>
            <span className={styles.label} id="session-type-label">Session type</span>
            <div aria-labelledby="session-type-label" className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="group">
              {sessionTypes.map(({ id, label, description, icon: Icon }) => (
                <button aria-pressed={kind === id} className={`${styles.typeCard} ${kind === id ? styles.selected : ""} flex min-h-[72px] items-center gap-2.5 px-3 py-3 text-left`} key={id} onClick={() => setKind(id)} type="button">
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#232326] ${kind === id ? "text-zinc-100" : "text-zinc-300"}`}><Icon aria-hidden="true" size={16} /></span>
                  <span className="min-w-0"><span className={`block font-bold text-white ${id === "revision" ? "text-[12px]" : "text-[14px]"}`}>{label}</span><span className={`mt-0.5 block text-zinc-400 ${id === "revision" ? "text-[10px]" : "text-[12px]"}`}>{description}</span></span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-zinc-500">{copy.helper}</p>
          </div>
          <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 [&>div]:min-w-0">
            <div className="sm:col-span-2">
              <label className={styles.label} htmlFor="session-title-input">{copy.title}</label>
              <input autoComplete="off" className={styles.input} id="session-title-input" maxLength={70} name="title" onChange={event => setTitle(event.target.value)} placeholder={copy.placeholder} required value={title} />
            </div>
            <div>
              <label className={styles.label} htmlFor="session-subject">Subject</label>
              <select className={styles.input} id="session-subject" name="subjectId" onChange={event => setSubjectId(event.target.value)} required value={subjectId}><option disabled value="">Choose subject</option>{subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select>
            </div>
            <div>
              <label className={styles.label} htmlFor="session-date">Date</label>
              <input className={styles.input} id="session-date" name="date" onChange={event => setDate(event.target.value)} required type="date" value={date} />
            </div>
            <div>
              <label className={styles.label} htmlFor="session-start">Start time</label>
              <input className={styles.input} id="session-start" name="startTime" onChange={event => setStartTime(event.target.value)} required type="time" value={startTime} />
            </div>
            {kind !== "exam" ? <div>
              <label className={styles.label} htmlFor="session-duration">Duration</label>
              <select className={styles.input} id="session-duration" name="durationMinutes" onChange={event => kind === "university" ? setUniversityDuration(event.target.value) : setRevisionDuration(event.target.value)} value={kind === "university" ? universityDuration : revisionDuration}>{durations[kind].map(minutes => <option key={minutes} value={minutes}>{durationLabels[minutes]}</option>)}</select>
            </div> : null}
            {kind !== "revision" ? <div>
              <label className={styles.label} htmlFor="session-location">Room / Location <span aria-hidden="true" className="font-normal text-zinc-500">— optional</span></label>
              <input className={styles.input} id="session-location" maxLength={500} name="location" onChange={event => setLocation(event.target.value)} placeholder="e.g. Hall A" value={location} />
            </div> : null}
            {kind === "university" ? <div className="sm:col-span-2">
              <label className={styles.label} htmlFor="session-professor">Professor <span className="font-normal text-zinc-500">— optional</span></label>
              <input className={styles.input} id="session-professor" maxLength={500} name="professor" onChange={event => setProfessor(event.target.value)} placeholder="e.g. Dr. Smith" value={professor} />
            </div> : null}
            {kind === "revision" ? <div className="sm:col-span-2">
              <label className={styles.label} htmlFor="session-focus">Focus or chapter <span className="font-normal text-zinc-500">· optional</span></label>
              <input className={styles.input} id="session-focus" maxLength={80} name="focusText" onChange={event => setFocusText(event.target.value)} placeholder="e.g. Chapter 4 · integrals" value={focusText} />
            </div> : null}
          </div>
          <section className="border-t border-[#27272a] pt-5">
            <div className="flex items-center justify-between gap-3">
              <div><h3 className="text-[14px] font-bold text-white">Notes &amp; Reminders</h3><p className="mt-1 text-[11px] text-zinc-500">Keep these in the order you need them.</p></div>
              <button className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#343438] bg-[#171719] px-3 py-2 text-[12px] font-bold text-white hover:bg-[#222225]" onClick={() => setNotes(items => [...items, ""])} type="button"><Plus aria-hidden="true" size={14} />Add item</button>
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
          <SessionRecurrenceFields date={date} timeZone={timeZone} />
          {state.status === "error" ? <p className="text-[14px] leading-5 text-zinc-300" role="alert">{state.message}</p> : null}
        </fieldset>
        <footer className="flex flex-col items-stretch justify-between gap-3 border-t border-[#27272a] px-4 py-4 sm:flex-row sm:items-center sm:px-6">
          <span className="text-[12px] font-medium text-zinc-400">You can edit this session later.</span>
          <div className="flex items-center justify-end gap-2 sm:justify-start">
            <button className="rounded-lg border border-[#343438] bg-[#171719] px-4 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-[#222225] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={pending} onClick={close} type="button">Cancel</button>
            <button aria-label={pending ? "Saving..." : "Add session"} className="flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2.5 text-[14px] font-bold text-black transition-colors hover:bg-white" disabled={pending || subjects.length === 0} type="submit">
              {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={15} /> : <Plus aria-hidden="true" size={15} />}
              <span role={pending ? "status" : undefined}>{pending ? "Saving..." : "Add session"}</span>
            </button>
          </div>
        </footer>
      </form>
    </ModalFrame>
  );
}
