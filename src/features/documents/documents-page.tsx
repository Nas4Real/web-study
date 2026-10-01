import { ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, FileText, Filter, Folder, Plus, Search } from "lucide-react";

import type { WorkspaceTone } from "@/domain/dto";
import { documentsPageFixture } from "@/fixtures";

const tones: Record<WorkspaceTone, string> = {
  algebra: "text-algebra",
  analysis: "text-analysis",
  physics: "text-physics",
  method: "text-method",
  neutral: "text-text-muted",
};

export function DocumentsPage() {
  return (
    <div className="min-h-full space-y-10 overflow-y-auto p-4 sm:p-6 xl:p-8">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div><h1 className="text-[28px] font-bold tracking-tight">Documents</h1><p className="mt-1 text-sm text-text-muted">Manage your study materials and AI summaries.</p></div>
        <div className="flex flex-wrap gap-3"><button className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black" type="button"><Plus aria-hidden="true" size={16} />New</button><button className="flex items-center gap-2 rounded-lg border border-border-panel bg-card px-4 py-2.5 text-sm font-semibold text-text-secondary" type="button"><Filter aria-hidden="true" size={15} />Filters</button><button className="flex items-center gap-2 rounded-lg border border-border-panel bg-card px-4 py-2.5 text-sm font-semibold text-text-secondary" type="button"><ArrowUpDown aria-hidden="true" size={15} />Sort By: Latest</button></div>
      </header>
      <label className="flex h-12 items-center gap-3 rounded-xl border border-border-panel bg-card px-4 text-text-muted"><Search aria-hidden="true" size={17} /><span className="sr-only">Search documents</span><input aria-label="Search documents" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-text-tertiary" placeholder="Search your documents, folders, and AI summaries..." type="search" /><kbd className="hidden rounded border border-border-panel bg-panel px-2 py-1 font-mono text-[10px] sm:block">⌘ K</kbd></label>
      <section><h2 className="mb-4 text-base font-bold">Subjects</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{documentsPageFixture.folders.map((folder) => <button className="rounded-xl border border-border-panel bg-card p-5 text-left transition-colors hover:bg-card-hover" key={folder.id} type="button"><Folder aria-hidden="true" className={tones[folder.tone]} size={27} /><span className="mt-4 block text-sm font-bold">{folder.name}</span><span className="mt-1 block text-xs text-text-muted">{folder.detail}</span></button>)}</div></section>
      <section><div className="mb-4 flex items-center justify-between"><h2 className="text-base font-bold">Recent</h2><div className="flex gap-2"><button aria-label="Previous recent files" className="grid size-8 place-items-center rounded-full border border-border-panel bg-card text-text-muted" type="button"><ChevronLeft aria-hidden="true" size={15} /></button><button aria-label="Next recent files" className="grid size-8 place-items-center rounded-full border border-border-panel bg-card text-text-muted" type="button"><ChevronRight aria-hidden="true" size={15} /></button></div></div><div className="flex gap-4 overflow-x-auto pb-2">{documentsPageFixture.recent.map((document) => <button className="flex min-w-[240px] items-center gap-3 rounded-xl border border-border-panel bg-card p-4 text-left" key={document.id} type="button"><span className="grid size-10 place-items-center rounded-lg border border-border-panel bg-card-hover text-text-muted"><FileText aria-hidden="true" size={18} /></span><span><span className="block text-sm font-semibold">{document.name}</span><span className="mt-1 block text-[11px] text-text-muted">{document.dateLabel} • {document.sizeLabel}</span></span></button>)}</div></section>
      <section><h2 className="mb-4 text-base font-bold">All Files</h2><div className="overflow-x-auto rounded-xl border border-border-panel bg-card"><table className="min-w-[760px] w-full text-left"><thead className="border-b border-border-panel bg-panel text-[10px] uppercase tracking-widest text-text-muted"><tr>{["Name", "Subject", "Type", "Size", "Date"].map((label) => <th className="px-6 py-4" key={label}>{label}<ArrowDown aria-hidden="true" className="ml-1 inline" size={10} /></th>)}</tr></thead><tbody className="divide-y divide-border-panel">{documentsPageFixture.files.map((document) => <tr className="text-sm" key={document.id}><td className="px-6 py-4 font-semibold"><FileText aria-hidden="true" className="mr-3 inline text-text-muted" size={15} />{document.name}</td><td className="px-6 py-4 text-text-secondary">{document.subjectLabel}</td><td className="px-6 py-4"><span className="rounded border border-border-panel bg-card-hover px-2 py-1 font-mono text-[10px] text-text-muted">{document.kindLabel}</span></td><td className="px-6 py-4 font-mono text-xs text-text-muted">{document.sizeLabel}</td><td className="px-6 py-4 text-xs text-text-muted">{document.dateLabel}</td></tr>)}</tbody></table></div></section>
    </div>
  );
}
