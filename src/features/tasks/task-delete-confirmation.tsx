"use client";

import { Trash2 } from "lucide-react";
import { ModalFrame } from "@/components/modal-frame";

export function TaskDeleteConfirmation({ title, pending, error, onCancel, onConfirm }: {
  title: string; pending: boolean; error: string | null; onCancel: () => void; onConfirm: () => void;
}) {
  return <ModalFrame labelId="task-delete-title" onClose={onCancel} widthClass="max-w-[400px]"
    panelClass="rounded-2xl shadow-2xl border-[#2a2a2e] bg-[#101012]" footerClass="border-[#27272a] bg-[#0a0a0c] px-6 py-4"
    closeClass="right-5 top-5 size-8 border-[#27272a] bg-[#171719] text-zinc-400" overlayClass="bg-black/70 p-4"
    footer={<><button className="flex-1 rounded-lg border border-[#3f3f46] bg-[#18181b] py-2 text-[12px] font-bold text-zinc-300 transition-colors hover:text-white" onClick={onCancel} type="button">Cancel</button><button className="flex-1 rounded-lg bg-[#f4f4f5] py-2 text-[12px] font-bold text-[#09090b] transition-opacity hover:opacity-90" disabled={pending} onClick={onConfirm} type="button">Delete Task</button></>}>
    <div className="relative p-6"><div className="mb-4 flex size-12 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10"><Trash2 aria-hidden="true" className="text-red-400" size={24} /></div><h2 className="mb-2 text-lg font-bold text-white" id="task-delete-title">Delete task?</h2><p className="text-[13px] leading-relaxed text-zinc-400">Delete <span className="font-medium text-white">{title}</span> and its subtasks? This cannot be undone.</p>{error ? <p className="mt-3 text-[13px] text-red-400" role="alert">{error}</p> : null}</div>
  </ModalFrame>;
}
