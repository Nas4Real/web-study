import type { DocumentsPageData } from "@/features/documents/documents-view-model";

const analysis = "10000000-0000-4000-8000-000000000001";
const physics = "10000000-0000-4000-8000-000000000002";
const algebra = "10000000-0000-4000-8000-000000000003";
const languages = "10000000-0000-4000-8000-000000000004";
const chapterSeries = "20000000-0000-4000-8000-000000000001";
const chapterIntegration = "20000000-0000-4000-8000-000000000002";
const chapterTopology = "20000000-0000-4000-8000-000000000003";
const chapterFunctions = "20000000-0000-4000-8000-000000000004";
const folderCours = "30000000-0000-4000-8000-000000000001";
const folderTd = "30000000-0000-4000-8000-000000000002";
const folderResume = "30000000-0000-4000-8000-000000000003";

export const documentsPageDataFixture = {
  subjects: [
    {
      id: analysis,
      name: "Analysis",
      color: "#06b6d4",
      chapterCount: 8,
      sizeBytes: 620_000_000,
      chapters: [
        {
          id: chapterSeries,
          name: "Chapter 1: Series",
          fileCount: 2,
          folders: [
            { id: folderCours, name: "Cours", parentId: null, fileCount: 1 },
            { id: folderTd, name: "TD", parentId: null, fileCount: 1 },
            { id: folderResume, name: "Summary", parentId: null, fileCount: 0 },
          ],
        },
        { id: chapterIntegration, name: "Chapter 2: Integration", fileCount: 0, folders: [] },
        { id: chapterTopology, name: "Chapter 3: Topology", fileCount: 0, folders: [] },
        { id: chapterFunctions, name: "Chapter 4: Functions", fileCount: 0, folders: [] },
      ],
    },
    { id: physics, name: "Physics", color: "#10b981", chapterCount: 5, sizeBytes: 510_000_000, chapters: [] },
    { id: algebra, name: "Math", color: "#ec4899", chapterCount: 6, sizeBytes: 420_000_000, chapters: [] },
    { id: languages, name: "Languages", color: "#a1a1aa", chapterCount: 4, sizeBytes: 150_000_000, chapters: [] },
  ],
  files: [
    {
      id: "40000000-0000-4000-8000-000000000001", name: "Sequence Data", extension: "pdf",
      sizeBytes: 1_200_000, subjectId: analysis, subjectLabel: "Analysis",
      chapterId: chapterSeries, folderId: folderTd, createdAt: "2023-10-24T12:00:00.000Z",
    },
    {
      id: "40000000-0000-4000-8000-000000000002", name: "Q4 Results", extension: "docx",
      sizeBytes: 2_500_000, subjectId: physics, subjectLabel: "Physics",
      chapterId: null, folderId: null, createdAt: "2023-10-21T12:00:00.000Z",
    },
    {
      id: "40000000-0000-4000-8000-000000000003", name: "Analysis Data April", extension: "pdf",
      sizeBytes: 840_000, subjectId: algebra, subjectLabel: "Math",
      chapterId: chapterSeries, folderId: folderCours, createdAt: "2023-09-15T12:00:00.000Z",
    },
    {
      id: "40000000-0000-4000-8000-000000000004", name: "Q2 Results", extension: "xlsx",
      sizeBytes: 4_100_000, subjectId: languages, subjectLabel: "Archived",
      chapterId: null, folderId: null, createdAt: "2023-08-10T12:00:00.000Z",
    },
  ],
} as const satisfies DocumentsPageData;
