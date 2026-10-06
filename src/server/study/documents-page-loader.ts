import "server-only";

import { documentsPageDataFixture } from "@/fixtures/documents-page-data";
import { createClient } from "@/lib/supabase/server";
import type { DocumentsPageData } from "@/features/documents/documents-view-model";

import { ChapterService } from "./chapter-service";
import { DocumentLibraryService } from "./document-library-service";
import { FolderService } from "./folder-service";
import {
  createSupabaseChapterRepository,
  createSupabaseDocumentLibraryRepository,
  createSupabaseFolderRepository,
} from "./supabase-document-repositories";
import {
  resolveE2eStudyScope,
  resolveTaskRequestContext,
} from "./task-request-context";

export async function loadDocumentsPageData(
  scope?: string,
): Promise<DocumentsPageData> {
  const context = await resolveTaskRequestContext(scope);
  if (!context) throw new Error("Unable to load documents");
  const e2eScope = await resolveE2eStudyScope(scope);
  if (e2eScope) return documentsPageDataFixture;

  try {
    const client = await createClient();
    const chapterService = new ChapterService(
      createSupabaseChapterRepository(client),
    );
    const folderService = new FolderService(
      createSupabaseFolderRepository(client),
    );
    const fileService = new DocumentLibraryService(
      createSupabaseDocumentLibraryRepository(client),
      {
        presignDownload: async () => {
          throw new Error("Download signing is unavailable in a page read.");
        },
      },
    );
    const [subjects, chapters, folders, files] = await Promise.all([
      context.subjectService.list(context.actorId),
      chapterService.list(context.actorId),
      folderService.list(context.actorId),
      fileService.list(context.actorId),
    ]);
    if (
      subjects.status === "error" ||
      chapters.status === "error" ||
      folders.status === "error" ||
      files.status === "error"
    ) {
      throw new Error("Provider read failed");
    }
    const subjectNames = new Map(
      subjects.data.map((subject) => [subject.id, subject.name]),
    );
    return {
      files: files.data.map((file) => ({
        chapterId: file.chapterId,
        createdAt: file.createdAt,
        extension: file.extension,
        folderId: file.folderId,
        id: file.id,
        name: file.displayName,
        sizeBytes: file.sizeBytes,
        subjectId: file.subjectId,
        subjectLabel: subjectNames.get(file.subjectId) ?? "Unknown",
      })),
      subjects: subjects.data.map((subject) => {
        const subjectFiles = files.data.filter(
          (file) => file.subjectId === subject.id,
        );
        return {
          id: subject.id,
          chapterCount: chapters.data.filter(
            (chapter) => chapter.subjectId === subject.id,
          ).length,
          name: subject.name,
          color: subject.color,
          sizeBytes: subjectFiles.reduce(
            (total, file) => total + file.sizeBytes,
            0,
          ),
          chapters: chapters.data
            .filter((chapter) => chapter.subjectId === subject.id)
            .map((chapter) => ({
              id: chapter.id,
              name: chapter.name,
              fileCount: subjectFiles.filter(
                (file) => file.chapterId === chapter.id,
              ).length,
              folders: folders.data
                .filter(
                  (folder) =>
                    folder.chapterId === chapter.id && folder.parentId === null,
                )
                .map((folder) => ({
                  id: folder.id,
                  name: folder.name,
                  parentId: folder.parentId,
                  fileCount: subjectFiles.filter(
                    (file) => file.folderId === folder.id,
                  ).length,
                })),
            })),
        };
      }),
    };
  } catch {
    throw new Error("Unable to load documents");
  }
}
