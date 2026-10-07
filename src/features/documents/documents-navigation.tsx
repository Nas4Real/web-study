import { ArrowLeft, FileText, Folder, Upload } from "lucide-react";
import { useState } from "react";

import { formatBytes, formatDate } from "./document-format";
import type {
  DocumentChapterViewModel,
  DocumentFileViewModel,
  DocumentSubjectViewModel,
} from "./documents-view-model";

export function DocumentsSubjectView({
  onBack,
  onOpenChapter,
  subject,
}: {
  onBack: () => void;
  onOpenChapter: (id: string) => void;
  subject: DocumentSubjectViewModel;
}) {
  return (
    <div className="min-h-full overflow-y-auto p-4 sm:p-6 xl:p-8">
      <header>
        <button
          className="flex items-center gap-2 text-sm font-semibold text-text-muted hover:text-white"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft aria-hidden="true" size={15} />
          Back to Documents
        </button>
        <div className="mt-5 flex items-start gap-4">
          <Folder
            aria-hidden="true"
            size={30}
            style={{ color: subject.color }}
          />
          <div>
            <h1 className="text-[28px] font-bold tracking-tight">
              {subject.name}
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              {subject.chapters.length} Chapters •{" "}
              {formatBytes(subject.sizeBytes)}
            </p>
          </div>
        </div>
      </header>
      <section className="mt-8">
        <h2 className="mb-4 text-base font-bold text-white">Chapters</h2>
        {subject.chapters.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {subject.chapters.map((chapter) => (
              <button
                className="flex items-center gap-4 rounded-xl border border-border-panel bg-card p-5 text-left transition-colors hover:bg-card-hover"
                key={chapter.id}
                onClick={() => onOpenChapter(chapter.id)}
                type="button"
              >
                <span className="grid size-10 place-items-center rounded-lg border border-border-panel bg-card-hover">
                  <Folder
                    aria-hidden="true"
                    size={20}
                    style={{ color: subject.color }}
                  />
                </span>
                <span>
                  <span className="block text-sm font-bold text-white">
                    {chapter.name}
                  </span>
                  <span className="mt-1 block text-xs text-text-muted">
                    {chapter.folders.length} Folders • {chapter.fileCount} Files
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-border-panel bg-card p-8 text-sm text-text-muted">
            No chapters yet.
          </p>
        )}
      </section>
    </div>
  );
}

export function DocumentsChapterView({
  chapter,
  files,
  onBack,
  subject,
}: {
  chapter: DocumentChapterViewModel;
  files: readonly DocumentFileViewModel[];
  onBack: () => void;
  subject: DocumentSubjectViewModel;
}) {
  const [folderId, setFolderId] = useState<string | null>(null);
  const visibleFiles = folderId
    ? files.filter((file) => file.folderId === folderId)
    : files;
  return (
    <div className="min-h-full overflow-y-auto p-4 sm:p-6 xl:p-8">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <button
            className="flex items-center gap-2 text-sm font-semibold text-text-muted hover:text-white"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft aria-hidden="true" size={15} />
            Back to {subject.name}
          </button>
          <div className="mt-5 flex items-start gap-4">
            <Folder
              aria-hidden="true"
              size={30}
              style={{ color: subject.color }}
            />
            <div>
              <h1 className="text-[28px] font-bold tracking-tight">
                {chapter.name}
              </h1>
              <p className="mt-1 text-sm text-text-muted">
                Documents <span aria-hidden="true">•</span> {subject.name}
              </p>
            </div>
          </div>
        </div>
        <button
          aria-label="Uploads are unavailable until storage is connected"
          className="flex cursor-not-allowed items-center gap-2 self-start rounded-full bg-zinc-700 px-5 py-2.5 text-sm font-bold text-text-muted"
          disabled
          type="button"
        >
          <Upload aria-hidden="true" size={16} />
          Upload unavailable
        </button>
      </header>
      <section className="mt-8">
        <h2 className="sr-only">Folders</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {chapter.folders.map((folder) => (
            <button
              aria-pressed={folderId === folder.id}
              className={`flex items-center gap-4 rounded-xl border p-5 text-left transition-colors ${folderId === folder.id ? "border-border-hover bg-card-hover" : "border-border-panel bg-card hover:bg-card-hover"}`}
              key={folder.id}
              onClick={() =>
                setFolderId((current) =>
                  current === folder.id ? null : folder.id,
                )
              }
              type="button"
            >
              <span className="grid size-10 place-items-center rounded-lg border border-border-panel bg-card-hover">
                <Folder
                  aria-hidden="true"
                  size={20}
                  style={{ color: subject.color }}
                />
              </span>
              <span>
                <span className="block text-sm font-bold text-white">
                  {folder.name}
                </span>
                <span className="mt-1 block text-xs text-text-muted">
                  {folder.fileCount} {folder.fileCount === 1 ? "File" : "Files"}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>
      <section className="mt-10">
        <h2 className="mb-4 text-base font-bold text-white">
          {folderId
            ? chapter.folders.find((folder) => folder.id === folderId)?.name
            : "All Files"}
        </h2>
        <div className="overflow-hidden rounded-xl border border-border-panel bg-card">
          {visibleFiles.length ? (
            visibleFiles.map((file) => (
              <div
                className="flex items-center gap-4 border-b border-border-panel p-4 last:border-b-0"
                key={file.id}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-border-panel bg-card-hover text-text-muted">
                  <FileText aria-hidden="true" size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">
                    {file.name}
                  </span>
                  <span className="mt-1 block text-xs text-text-muted">
                    {formatBytes(file.sizeBytes)} • {formatDate(file.createdAt)}
                  </span>
                </span>
              </div>
            ))
          ) : (
            <p className="p-8 text-center text-sm text-text-muted">
              No files in this folder.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
