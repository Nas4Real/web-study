import { describe, expect, it } from "vitest";

import {
  chapterCreateInputSchema,
  chapterUpdateInputSchema,
  folderCreateInputSchema,
  folderUpdateInputSchema,
} from "./document-domain";

const SUBJECT_ID = "22222222-2222-4222-8222-222222222222";
const CHAPTER_ID = "33333333-3333-4333-8333-333333333333";
const FOLDER_ID = "44444444-4444-4444-8444-444444444444";

describe("document hierarchy contracts", () => {
  it("normalizes chapter and folder names and supplies stable positions", () => {
    expect(chapterCreateInputSchema.parse({ name: "  Linear   algebra ", subjectId: SUBJECT_ID })).toEqual({
      name: "Linear algebra", position: 0, subjectId: SUBJECT_ID,
    });
    expect(folderCreateInputSchema.parse({
      chapterId: CHAPTER_ID, name: "  Problem   sets ", parentId: FOLDER_ID, subjectId: SUBJECT_ID,
    })).toEqual({
      chapterId: CHAPTER_ID, name: "Problem sets", parentId: FOLDER_ID, position: 0, subjectId: SUBJECT_ID,
    });
  });

  it("rejects malformed identifiers, empty names, and empty patches", () => {
    expect(chapterCreateInputSchema.safeParse({ name: "", subjectId: "bad" }).success).toBe(false);
    expect(folderCreateInputSchema.safeParse({ name: "Folder", subjectId: "bad" }).success).toBe(false);
    expect(chapterUpdateInputSchema.safeParse({}).success).toBe(false);
    expect(folderUpdateInputSchema.safeParse({}).success).toBe(false);
  });
});
