import {
  ArrowDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
  Folder,
  Plus,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { formatBytes, formatDate } from "./document-format";
import {
  filterAndSortDocuments,
  subjectMatchesDocumentSearch,
  type DocumentSort,
  type DocumentsPageData,
} from "./documents-view-model";

const sortLabels: Record<DocumentSort, string> = {
  latest: "Latest",
  oldest: "Oldest",
  name: "Name",
  size: "Size",
};

export function DocumentsRoot({
  data,
  onOpenSubject,
}: {
  data: DocumentsPageData;
  onOpenSubject: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<DocumentSort>("latest");
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [extensions, setExtensions] = useState<readonly string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const recentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);
  const files = useMemo(
    () =>
      filterAndSortDocuments(data.files, query, sort).filter(
        (file) => !extensions.length || extensions.includes(file.extension),
      ),
    [data.files, extensions, query, sort],
  );
  const recent = useMemo(
    () => filterAndSortDocuments(data.files, "", "latest").slice(0, 3),
    [data.files],
  );
  const subjects = data.subjects.filter((subject) =>
    subjectMatchesDocumentSearch(subject, query),
  );

  return (
    <div className="min-h-full space-y-10 overflow-y-auto p-4 sm:p-6 xl:p-8">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Documents</h1>
          <p className="mt-1 text-sm text-text-muted">
            Manage your study materials and AI summaries.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black"
            type="button"
          >
            <Plus aria-hidden="true" size={16} />
            New
          </button>
          <span className="relative">
            <button
              aria-expanded={filtersOpen}
              className="flex items-center gap-2 rounded-lg border border-border-panel bg-card px-4 py-2.5 text-sm font-semibold text-text-secondary"
              onClick={() => setFiltersOpen((open) => !open)}
              type="button"
            >
              <Filter aria-hidden="true" size={15} />
              Filters{extensions.length ? ` (${extensions.length})` : ""}
            </button>
            {filtersOpen ? (
              <span className="absolute right-0 top-12 z-20 w-44 rounded-lg border border-border-hover bg-card p-2 shadow-2xl">
                {["pdf", "docx", "xlsx", "pptx", "png", "jpg"].map(
                  (extension) => (
                    <label
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs font-semibold uppercase text-text-secondary hover:bg-card-hover"
                      key={extension}
                    >
                      <input
                        checked={extensions.includes(extension)}
                        onChange={() =>
                          setExtensions((current) =>
                            current.includes(extension)
                              ? current.filter((item) => item !== extension)
                              : [...current, extension],
                          )
                        }
                        type="checkbox"
                      />
                      {extension}
                    </label>
                  ),
                )}
              </span>
            ) : null}
          </span>
          <span className="relative">
            <button
              aria-expanded={sortOpen}
              className="flex items-center gap-2 rounded-lg border border-border-panel bg-card px-4 py-2.5 text-sm font-semibold text-text-secondary"
              onClick={() => setSortOpen((open) => !open)}
              type="button"
            >
              <ArrowUpDown aria-hidden="true" size={15} />
              Sort By: {sortLabels[sort]}
            </button>
            {sortOpen ? (
              <span className="absolute right-0 top-12 z-20 w-40 rounded-lg border border-border-hover bg-card p-1 shadow-2xl">
                {(Object.keys(sortLabels) as DocumentSort[]).map((option) => (
                  <button
                    aria-pressed={sort === option}
                    className="block w-full rounded px-3 py-2 text-left text-xs font-semibold text-text-secondary hover:bg-card-hover hover:text-white"
                    key={option}
                    onClick={() => {
                      setSort(option);
                      setSortOpen(false);
                    }}
                    type="button"
                  >
                    {sortLabels[option]}
                  </button>
                ))}
              </span>
            ) : null}
          </span>
        </div>
      </header>
      <label className="flex h-12 items-center gap-3 rounded-xl border border-border-panel bg-card px-4 text-text-muted">
        <Search aria-hidden="true" size={17} />
        <span className="sr-only">Search documents</span>
        <input
          aria-label="Search documents"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-text-tertiary"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search your documents, folders, and AI summaries..."
          ref={searchRef}
          type="search"
          value={query}
        />
        <kbd className="hidden rounded border border-border-panel bg-panel px-2 py-1 font-mono text-[10px] sm:block">
          ⌘ K
        </kbd>
      </label>
      <section>
        <h2 className="mb-4 text-base font-bold text-white">Subjects</h2>
        {subjects.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {subjects.map((subject) => (
              <button
                className="rounded-xl border border-border-panel bg-card p-5 text-left transition-colors hover:bg-card-hover"
                key={subject.id}
                onClick={() => onOpenSubject(subject.id)}
                type="button"
              >
                <Folder
                  aria-hidden="true"
                  size={27}
                  style={{ color: subject.color }}
                />
                <span className="mt-4 block text-sm font-bold">
                  {subject.name}
                </span>
                <span className="mt-1 block text-xs text-text-muted">
                    {subject.chapterCount} Chapters •{" "}
                  {formatBytes(subject.sizeBytes)}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-border-panel bg-card p-8 text-center text-sm text-text-muted">
            No subjects match your search.
          </p>
        )}
      </section>
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Recent</h2>
          <div className="flex gap-2">
            <button
              aria-label="Previous recent files"
              className="grid size-8 place-items-center rounded-full border border-border-panel bg-card text-text-muted"
              onClick={() =>
                recentRef.current?.scrollBy({ behavior: "smooth", left: -260 })
              }
              type="button"
            >
              <ChevronLeft aria-hidden="true" size={15} />
            </button>
            <button
              aria-label="Next recent files"
              className="grid size-8 place-items-center rounded-full border border-border-panel bg-card text-text-muted"
              onClick={() =>
                recentRef.current?.scrollBy({ behavior: "smooth", left: 260 })
              }
              type="button"
            >
              <ChevronRight aria-hidden="true" size={15} />
            </button>
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2" ref={recentRef}>
          {recent.map((file) => (
            <div
              className="flex min-w-[240px] items-center gap-3 rounded-xl border border-border-panel bg-card p-4 text-left"
              key={file.id}
            >
              <span className="grid size-10 place-items-center rounded-lg border border-border-panel bg-card-hover text-text-muted">
                <FileText aria-hidden="true" size={18} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">
                  {file.name}
                </span>
                <span className="mt-1 block text-[11px] text-text-muted">
                  {formatDate(file.createdAt)} • {formatBytes(file.sizeBytes)}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-4 text-base font-bold text-white">All Files</h2>
        <div className="overflow-x-auto rounded-xl border border-border-panel bg-card">
          <table className="w-full min-w-[760px] text-left">
            <thead className="border-b border-border-panel bg-panel text-[10px] uppercase tracking-widest text-text-muted">
              <tr>
                {["Name", "Subject", "Type", "Size", "Date"].map((label) => (
                  <th className="px-6 py-4" key={label}>
                    {label}
                    <ArrowDown
                      aria-hidden="true"
                      className="ml-1 inline"
                      size={10}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-panel">
              {files.map((file) => (
                <tr className="text-sm" key={file.id}>
                  <td className="px-6 py-4 font-semibold">
                    <FileText
                      aria-hidden="true"
                      className="mr-3 inline text-text-muted"
                      size={15}
                    />
                    {file.name}
                  </td>
                  <td className="px-6 py-4 text-text-secondary">
                    {file.subjectLabel}
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded border border-border-panel bg-card-hover px-2 py-1 font-mono text-[10px] uppercase text-text-muted">
                      {file.extension}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-text-muted">
                    {formatBytes(file.sizeBytes)}
                  </td>
                  <td className="px-6 py-4 text-xs text-text-muted">
                    {formatDate(file.createdAt)}
                  </td>
                </tr>
              ))}
              {!files.length ? (
                <tr>
                  <td
                    className="px-6 py-10 text-center text-sm text-text-muted"
                    colSpan={5}
                  >
                    No files match your search and filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
