"use client";

import { BookOpen, Clock3, MapPin, Pencil, Trash2, UserRound } from "lucide-react";

import { ModalFrame } from "@/components/modal-frame";
import { sessionDetailFixture } from "@/fixtures";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Africa/Tunis" }).format(new Date(value));
}

export function SessionDetailsModal({ onClose }: { onClose: () => void }) {
  return <ModalFrame footer={<div className="flex w-full items-center justify-between"><button className="flex items-center gap-2 text-sm font-semibold text-red-400" type="button"><Trash2 aria-hidden="true" size={16} />Delete Session</button><div className="flex items-center gap-3"><button className="px-3 py-2 text-sm font-semibold text-text-secondary" onClick={onClose} type="button">Close</button><button className="flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-black" type="button"><Pencil aria-hidden="true" size={15} />Edit</button></div></div>} labelId="session-detail-title" onClose={onClose} widthClass="max-w-[500px]"><header className="flex items-start gap-4 border-b border-border-panel px-6 py-5 pr-20"><span className="grid size-12 shrink-0 place-items-center rounded-xl border border-physics/40 bg-physics/10 text-physics"><BookOpen aria-hidden="true" size={22} /></span><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-physics">Physics</p><h2 className="mt-2 text-xl font-bold" id="session-detail-title">{sessionDetailFixture.title}</h2><p className="mt-1 flex items-center gap-2 text-xs text-text-muted"><Clock3 aria-hidden="true" size={14} />{formatTime(sessionDetailFixture.startsAt)} – {formatTime(sessionDetailFixture.endsAt)}</p></div></header><div className="space-y-6 px-6 py-5"><div className="grid gap-3 text-sm text-text-secondary sm:grid-cols-2"><p className="flex items-center gap-2"><MapPin aria-hidden="true" size={16} />{sessionDetailFixture.location}</p><p className="flex items-center gap-2"><UserRound aria-hidden="true" size={16} />{sessionDetailFixture.professor}</p></div><section><h3 className="text-xs font-bold uppercase text-text-secondary">Notes &amp; Reminders</h3><div className="mt-3 space-y-3 rounded-xl border border-border-panel bg-card-hover p-4">{sessionDetailFixture.notesItems.map((item) => <p className="flex gap-3 text-sm leading-5 text-text-secondary" key={item.id}><span aria-hidden="true" className="text-physics">→</span>{item.text}</p>)}</div></section></div></ModalFrame>;
}
