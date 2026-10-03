"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

export function TaskAuthoringSubtasks() {
  const [rows, setRows] = useState<{ id: number; title: string }[]>([]);
  const nextId = useRef(0);
  const inputs = useRef(new Map<number, HTMLInputElement>());
  const addButton = useRef<HTMLButtonElement>(null);
  const focusRequest = useRef<number | "add" | null>(null);
  const controlClass = "size-6 flex items-center justify-center rounded-md hover:bg-card-hover text-text-muted disabled:opacity-30 disabled:hover:bg-transparent";

  useLayoutEffect(() => {
    const target = focusRequest.current;
    if (target === "add") addButton.current?.focus();
    else if (target !== null) inputs.current.get(target)?.focus();
    focusRequest.current = null;
  }, [rows]);

  function move(index: number, offset: number) {
    const next = [...rows];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    focusRequest.current = rows[index].id;
    setRows(next);
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="new-task-subtasks-label">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-text-secondary" id="new-task-subtasks-label">Subtasks <span className="text-text-disabled font-normal ml-1">— optional</span></span>
        <button className="text-[11px] font-semibold text-text-muted hover:text-white transition-colors flex items-center gap-1.5 disabled:opacity-50" disabled={rows.length >= 100} ref={addButton} onClick={() => {
          const id = nextId.current++;
          focusRequest.current = id;
          setRows([...rows, { id, title: "" }]);
        }} type="button"><Plus aria-hidden="true" size={14} />Add subtask</button>
      </div>
      {rows.length === 0 ? <div className="p-4 border border-dashed border-border-base rounded-lg text-center"><p className="text-xs text-text-disabled">No subtasks added yet.</p></div> : null}
      <div className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <div className="subtask-row group flex items-center gap-2 bg-base border border-border-base rounded-lg p-2 transition-colors hover:border-border-hover" key={row.id}>
            <span className="shrink-0 size-6 flex items-center justify-center bg-card rounded-md text-[10px] font-mono text-text-tertiary">{index + 1}</span>
            <input aria-label={`Subtask ${index + 1} title`} className="flex-1 min-w-0 bg-transparent border-none text-sm text-text placeholder:text-text-disabled outline-none" maxLength={300} name="subtaskTitle" placeholder="Subtask description..." required value={row.title} onChange={event => setRows(rows.map(item => item.id === row.id ? { ...item, title: event.target.value } : item))} ref={element => {
              if (element) {
                inputs.current.set(row.id, element);
              } else inputs.current.delete(row.id);
            }} />
            <div className="subtask-controls flex items-center gap-1 transition-opacity">
              <button aria-label={`Move subtask ${index + 1} up`} className={controlClass} disabled={index === 0} onClick={() => move(index, -1)} type="button"><ChevronUp aria-hidden="true" size={16} /></button>
              <button aria-label={`Move subtask ${index + 1} down`} className={controlClass} disabled={index === rows.length - 1} onClick={() => move(index, 1)} type="button"><ChevronDown aria-hidden="true" size={16} /></button>
              <button aria-label={`Remove subtask ${index + 1}`} className="size-6 flex items-center justify-center rounded-md hover:bg-red-900/20 text-text-muted hover:text-red-400" onClick={() => {
                const neighbor = rows[index + 1] ?? rows[index - 1];
                focusRequest.current = neighbor?.id ?? "add";
                setRows(rows.filter(item => item.id !== row.id));
              }} type="button"><Trash2 aria-hidden="true" size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
