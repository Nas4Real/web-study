import { describe, expect, it } from "vitest";

import {
  authFixture,
  calendarFixture,
  calendarViewFixture,
  dashboardFixture,
  documentsFixture,
  profileFixture,
  sessionDetailFixture,
  settingsFixture,
  subjectsFixture,
  taskDetailFixture,
  tasksFixture,
} from "./index";
import { visualTargets } from "./visual-targets";

describe("Web Study fixtures", () => {
  it("represents every approved product surface", () => {
    expect(dashboardFixture).toBeDefined();
    expect(calendarFixture.occurrences.length).toBeGreaterThan(0);
    expect(calendarFixture.availableViews).toEqual(["day", "week", "month"]);
    expect(calendarViewFixture.weekDays).toHaveLength(7);
    expect(calendarViewFixture.daySections.flatMap(({ events }) => events).some(({ inProgress }) => inProgress)).toBe(true);
    expect(calendarViewFixture.monthCells).toHaveLength(35);
    expect(tasksFixture.length).toBeGreaterThan(0);
    expect(documentsFixture.length).toBeGreaterThan(0);
    expect(settingsFixture).toBeDefined();
    expect(authFixture.screens).toEqual([
      "sign-in",
      "sign-up",
      "forgot-password",
      "set-new-password",
    ]);
    expect(taskDetailFixture).toBeDefined();
    expect(sessionDetailFixture).toBeDefined();
  });

  it("uses stable ISO dates, IDs, and valid subject references", () => {
    const subjectIds = new Set(subjectsFixture.map(({ id }) => id));

    expect(profileFixture.id).toBe("profile-demo");
    expect(tasksFixture.every(({ subject }) => subjectIds.has(subject.id))).toBe(true);
    expect(Number.isNaN(Date.parse(taskDetailFixture.dueAt ?? ""))).toBe(false);
    expect(Number.isNaN(Date.parse(sessionDetailFixture.originalStart))).toBe(false);
    expect(Number.isNaN(Date.parse(sessionDetailFixture.startsAt))).toBe(false);
  });

  it("keeps parent and subtask completion independent", () => {
    expect(taskDetailFixture.status).toBe("completed");
    expect(taskDetailFixture.completedAt).not.toBeNull();
    expect(taskDetailFixture.subtasks.some(({ completedAt }) => completedAt === null)).toBe(true);
  });

  it("models session details as an effective recurring occurrence", () => {
    expect(sessionDetailFixture.isRecurring).toBe(true);
    expect(sessionDetailFixture.originalStart).not.toBe(sessionDetailFixture.startsAt);
    expect(sessionDetailFixture.location).toBe("Room 304, Sci-Tech");
    expect(sessionDetailFixture.notesItems.map(({ position }) => position)).toEqual([0, 1, 2]);
  });

  it("applies locked auth and storage decisions over historical mocks", () => {
    expect(authFixture.providers).toEqual(["email", "google"]);
    expect(profileFixture.storageQuotaBytes).toBe(2_147_483_648);
  });
});

describe("visual target registry", () => {
  it("records live Superdesign before screenshot fallbacks", () => {
    expect(visualTargets.precedence).toEqual([
      "live-superdesign",
      "same-project-superdesign",
      "v4-screenshot",
      "v2-screenshot",
      "written-contract",
      "historical-preview",
    ]);
    expect(visualTargets.superdesign.projectId).toBe("71292a60-75e4-449b-a39f-0456ec77d72f");
    expect(visualTargets.targets.dashboard.source).toBe("same-project-superdesign");
    expect(visualTargets.targets.calendar.source).toBe("live-superdesign");
    expect(visualTargets.targets.taskDetails.source).toBe("v4-screenshot");
  });

  it("records deterministic reference viewports", () => {
    expect(visualTargets.viewports.application).toEqual({ width: 1440, height: 1200 });
    expect(visualTargets.viewports.auth).toEqual({ width: 1440, height: 900 });
  });
});
