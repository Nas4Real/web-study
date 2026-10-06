export type DocumentSort = "latest" | "oldest" | "name" | "size";

export type DocumentFileViewModel = Readonly<{
  chapterId: string | null;
  createdAt: string;
  extension: string;
  folderId: string | null;
  id: string;
  name: string;
  sizeBytes: number;
  subjectId: string;
  subjectLabel: string;
}>;

export type DocumentFolderViewModel = Readonly<{
  fileCount: number;
  id: string;
  name: string;
  parentId: string | null;
}>;

export type DocumentChapterViewModel = Readonly<{
  fileCount: number;
  folders: readonly DocumentFolderViewModel[];
  id: string;
  name: string;
}>;

export type DocumentSubjectViewModel = Readonly<{
  chapterCount: number;
  chapters: readonly DocumentChapterViewModel[];
  color: string;
  id: string;
  name: string;
  sizeBytes: number;
}>;

export type DocumentsPageData = Readonly<{
  files: readonly DocumentFileViewModel[];
  subjects: readonly DocumentSubjectViewModel[];
}>;

function searchable(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}

export function subjectMatchesDocumentSearch(
  subject: DocumentSubjectViewModel,
  query: string,
) {
  const needle = searchable(query.trim());
  if (!needle) return true;
  const hierarchy = [
    subject.name,
    ...subject.chapters.flatMap((chapter) => [
      chapter.name,
      ...chapter.folders.map((folder) => folder.name),
    ]),
  ].join(" ");
  return searchable(hierarchy).includes(needle);
}

export function filterAndSortDocuments(
  files: readonly DocumentFileViewModel[],
  query: string,
  sort: DocumentSort,
) {
  const needle = searchable(query.trim());
  const filtered = needle
    ? files.filter((file) =>
        searchable(
          `${file.name} ${file.subjectLabel} ${file.extension}`,
        ).includes(needle),
      )
    : [...files];
  return filtered.sort((left, right) => {
    if (sort === "oldest")
      return (
        left.createdAt.localeCompare(right.createdAt) ||
        left.id.localeCompare(right.id)
      );
    if (sort === "name")
      return (
        left.name.localeCompare(right.name, undefined, {
          sensitivity: "base",
        }) || left.id.localeCompare(right.id)
      );
    if (sort === "size")
      return (
        right.sizeBytes - left.sizeBytes || left.id.localeCompare(right.id)
      );
    return (
      right.createdAt.localeCompare(left.createdAt) ||
      left.id.localeCompare(right.id)
    );
  });
}
