import { describe, expect, it } from "vitest";

import {
  filterAndSortDocuments,
  subjectMatchesDocumentSearch,
  type DocumentsPageData,
} from "./documents-view-model";

const data = {
  subjects: [
    {
      id: "subject-analysis",
      name: "Analysis",
      color: "#06b6d4",
      chapterCount: 0,
      chapters: [],
      sizeBytes: 1200,
    },
    {
      id: "subject-physics",
      name: "Physics",
      color: "#10b981",
      chapterCount: 0,
      chapters: [],
      sizeBytes: 2500,
    },
  ],
  files: [
    {
      id: "file-b",
      name: "Quantum Notes.pdf",
      extension: "pdf",
      sizeBytes: 2000,
      subjectId: "subject-physics",
      subjectLabel: "Physics",
      chapterId: null,
      folderId: null,
      createdAt: "2026-10-02T10:00:00.000Z",
    },
    {
      id: "file-a",
      name: "Analysis Summary.docx",
      extension: "docx",
      sizeBytes: 500,
      subjectId: "subject-analysis",
      subjectLabel: "Analysis",
      chapterId: null,
      folderId: null,
      createdAt: "2026-10-01T10:00:00.000Z",
    },
    {
      id: "file-c",
      name: "Old Analysis.pdf",
      extension: "pdf",
      sizeBytes: 3000,
      subjectId: "subject-analysis",
      subjectLabel: "Analysis",
      chapterId: null,
      folderId: null,
      createdAt: "2026-09-20T10:00:00.000Z",
    },
  ],
} satisfies DocumentsPageData;

describe("documents view model", () => {
  it("searches file names and subject labels without case or accent sensitivity", () => {
    expect(
      filterAndSortDocuments(data.files, "ANALYSIS", "latest").map(
        (file) => file.id,
      ),
    ).toEqual(["file-a", "file-c"]);
    expect(
      filterAndSortDocuments(data.files, "QUANTUM", "latest").map(
        (file) => file.id,
      ),
    ).toEqual(["file-b"]);
  });

  it("provides deterministic latest, oldest, name, and size sorting", () => {
    expect(
      filterAndSortDocuments(data.files, "", "latest").map((file) => file.id),
    ).toEqual(["file-b", "file-a", "file-c"]);
    expect(
      filterAndSortDocuments(data.files, "", "oldest").map((file) => file.id),
    ).toEqual(["file-c", "file-a", "file-b"]);
    expect(
      filterAndSortDocuments(data.files, "", "name").map((file) => file.id),
    ).toEqual(["file-a", "file-c", "file-b"]);
    expect(
      filterAndSortDocuments(data.files, "", "size").map((file) => file.id),
    ).toEqual(["file-c", "file-b", "file-a"]);
  });

  it("matches subject, chapter, and folder names without accents", () => {
    const subject = {
      ...data.subjects[0],
      chapterCount: 1,
      chapters: [
        {
          id: "chapter-analysis",
          name: "Topologie",
          fileCount: 0,
          folders: [
            {
              id: "folder-summary",
              name: "Résumé",
              parentId: null,
              fileCount: 0,
            },
          ],
        },
      ],
    };
    expect(subjectMatchesDocumentSearch(subject, "resume")).toBe(true);
    expect(subjectMatchesDocumentSearch(subject, "topologie")).toBe(true);
    expect(subjectMatchesDocumentSearch(subject, "physics")).toBe(false);
  });
});
