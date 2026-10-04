"use client";

import { useState } from "react";
import styles from "./new-session-modal.module.css";

const weekdays = [
  { code: "MO", name: "Monday", letter: "M" }, { code: "TU", name: "Tuesday", letter: "T" },
  { code: "WE", name: "Wednesday", letter: "W" }, { code: "TH", name: "Thursday", letter: "T" },
  { code: "FR", name: "Friday", letter: "F" }, { code: "SA", name: "Saturday", letter: "S" },
  { code: "SU", name: "Sunday", letter: "S" },
];
const units: Record<string, string> = { daily: "day", weekly: "week", monthly: "month" };

export interface SessionRecurrenceValue {
  frequency: "none" | "daily" | "weekly" | "monthly";
  interval?: number;
  weekdays?: string[];
  end?: "never" | "date" | "count";
  count?: number;
  until?: string;
}

export function SessionRecurrenceFields({ date, initialValue, timeZone }: {
  date: string;
  initialValue?: SessionRecurrenceValue;
  timeZone: string;
}) {
  const [frequency, setFrequency] = useState(initialValue?.frequency ?? "none");
  const [interval, setInterval] = useState(String(initialValue?.interval ?? 1));
  const [end, setEnd] = useState(initialValue?.end ?? "never");
  const [count, setCount] = useState(String(initialValue?.count ?? 12));
  const [until, setUntil] = useState(initialValue?.until ?? "");
  const [customDays, setCustomDays] = useState<string[] | null>(initialValue?.weekdays ?? null);
  // Civil-date selection must not depend on the browser's local timezone.
  const weekdayIndex = new Date(`${date}T00:00:00Z`).getUTCDay();
  const defaultDay = weekdays[(weekdayIndex + 6) % 7]?.code ?? "MO";
  const selectedDays = customDays ?? [defaultDay];
  const unit = (units[frequency] ?? "") + (interval !== "1" ? "s" : "");
  let summary = `Every ${interval} ${unit}`;
  if (frequency === "weekly") summary += ` on ${weekdays.filter(day => selectedDays.includes(day.code)).map(day => day.name).join(", ")}`;
  if (end === "count") summary += ` · ${count} occurrences total`;
  if (end === "date") summary += ` · through ${until}`;
  if (end === "never") summary += " · no end date";

  function toggleDay(code: string) {
    if (selectedDays.includes(code)) {
      if (selectedDays.length > 1) setCustomDays(selectedDays.filter(day => day !== code));
    } else setCustomDays([...selectedDays, code]);
  }

  return (
    <div className="space-y-4 border-t border-[#27272a] pt-5" id="session-recurrence">
      <div>
        <label className={styles.label} htmlFor="repeat-frequency">Repeat</label>
        <select className={styles.input} id="repeat-frequency" name="repeatFrequency" onChange={event => setFrequency(event.target.value as SessionRecurrenceValue["frequency"])} value={frequency}>
          <option value="none">Does not repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
        </select>
      </div>
      {frequency !== "none" ? <div className="space-y-4">
        <div>
          <label className={styles.label} htmlFor="repeat-interval">Repeat every</label>
          <div className="flex items-center gap-3">
            <input className={`${styles.input} max-w-[88px]`} id="repeat-interval" max={99} min={1} name="repeatInterval" onChange={event => setInterval(event.target.value)} required type="number" value={interval} />
            <span className="text-[14px] font-medium text-zinc-300">{unit}</span>
          </div>
        </div>
        {frequency === "weekly" ? <fieldset>
          <legend className={styles.label}>Repeat on</legend>
          <div className="flex flex-wrap gap-2">
            {weekdays.map(day => <button aria-label={day.name} aria-pressed={selectedDays.includes(day.code)} className={`${styles.repeatDay} flex size-10 items-center justify-center rounded-lg border border-[#2f2f34] bg-[#141416] text-[14px] font-bold text-zinc-300 transition-colors hover:border-zinc-500`} key={day.code} onClick={() => toggleDay(day.code)} type="button">{day.letter}</button>)}
          </div>
          {selectedDays.map(day => <input key={day} name="repeatWeekday" type="hidden" value={day} />)}
        </fieldset> : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={styles.label} htmlFor="repeat-end">Ends</label>
            <select className={styles.input} id="repeat-end" name="repeatEnd" onChange={event => setEnd(event.target.value as NonNullable<SessionRecurrenceValue["end"]>)} value={end}>
              <option value="never">Never</option><option value="date">On a date</option><option value="count">After occurrences</option>
            </select>
          </div>
          {end === "count" ? <div>
            <label className={styles.label} htmlFor="repeat-count">Occurrences</label>
            <input className={styles.input} id="repeat-count" max={500} min={1} name="repeatCount" onChange={event => setCount(event.target.value)} required type="number" value={count} />
          </div> : null}
          {end === "date" ? <div>
            <label className={styles.label} htmlFor="repeat-until">End date</label>
            <input className={styles.input} id="repeat-until" min={date || undefined} name="repeatUntil" onChange={event => setUntil(event.target.value)} required type="date" value={until} />
          </div> : null}
        </div>
        {frequency === "monthly" ? <p className="text-[12px] leading-5 text-zinc-400">Repeats on the same day of the month. Months without that date are skipped.</p> : null}
        <p aria-live="polite" className="text-[12px] font-medium leading-5 text-zinc-300">{summary}.</p>
        <p className="text-[11px] leading-4 text-zinc-500">Times follow your profile timezone: {timeZone}.</p>
      </div> : null}
    </div>
  );
}
