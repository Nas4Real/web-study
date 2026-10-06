"use client";

import { useState } from "react";

import type { DocumentsPageData } from "./documents-view-model";
import {
  DocumentsChapterView,
  DocumentsSubjectView,
} from "./documents-navigation";
import { DocumentsRoot } from "./documents-root";

type Location =
  | Readonly<{ level: "root" }>
  | Readonly<{ level: "subject"; subjectId: string }>
  | Readonly<{ chapterId: string; level: "chapter"; subjectId: string }>;

export function DocumentsPage({ data }: { data: DocumentsPageData }) {
  const [location, setLocation] = useState<Location>({ level: "root" });
  if (location.level === "root") {
    return (
      <DocumentsRoot
        data={data}
        onOpenSubject={(subjectId) =>
          setLocation({ level: "subject", subjectId })
        }
      />
    );
  }
  const subject = data.subjects.find((item) => item.id === location.subjectId);
  if (!subject)
    return (
      <DocumentsRoot
        data={data}
        onOpenSubject={(subjectId) =>
          setLocation({ level: "subject", subjectId })
        }
      />
    );
  if (location.level === "subject") {
    return (
      <DocumentsSubjectView
        onBack={() => setLocation({ level: "root" })}
        onOpenChapter={(chapterId) =>
          setLocation({ chapterId, level: "chapter", subjectId: subject.id })
        }
        subject={subject}
      />
    );
  }
  const chapter = subject.chapters.find(
    (item) => item.id === location.chapterId,
  );
  if (!chapter)
    return (
      <DocumentsSubjectView
        onBack={() => setLocation({ level: "root" })}
        onOpenChapter={(chapterId) =>
          setLocation({ chapterId, level: "chapter", subjectId: subject.id })
        }
        subject={subject}
      />
    );
  return (
    <DocumentsChapterView
      chapter={chapter}
      files={data.files.filter((file) => file.chapterId === chapter.id)}
      onBack={() => setLocation({ level: "subject", subjectId: subject.id })}
      subject={subject}
    />
  );
}
