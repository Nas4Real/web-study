export type VisualSource =
  | "live-superdesign"
  | "same-project-superdesign"
  | "v4-screenshot"
  | "v2-screenshot"
  | "written-contract"
  | "historical-preview";

interface VisualTarget {
  source: VisualSource;
  reference: string;
  liveDraftAvailable: boolean;
}

export const visualTargets = {
  precedence: [
    "live-superdesign",
    "same-project-superdesign",
    "v4-screenshot",
    "v2-screenshot",
    "written-contract",
    "historical-preview",
  ],
  superdesign: {
    projectId: "71292a60-75e4-449b-a39f-0456ec77d72f",
    projectName: "WEB STUDY",
    calendarDraftId: "9fc1a7b4-af57-48f9-b645-88f741ca400a",
    calendarDraftVersion: 53,
    designSystemDraftId: "8aa64fb9-b219-4ac8-bd46-210672382d9c",
    designSystemDraftVersion: 10,
    dashboardDraftId: "4cd2386e-ae7b-47fa-8029-7cd5db1d6636",
    dashboardDraftVersion: 1,
  },
  viewports: {
    application: { width: 1440, height: 1200 },
    auth: { width: 1440, height: 900 },
  },
  targets: {
    dashboard: sameProjectTarget("Superdesign Dashboard draft v1"),
    calendar: liveTarget("Superdesign calendar draft v53"),
    tasks: screenshotTarget("design-reference/screenshots/v2/05_Tasks.png"),
    documents: screenshotTarget("design-reference/screenshots/v2/06_Documents.png"),
    settings: screenshotTarget("design-reference/screenshots/v2/07_Settings.png"),
    signIn: screenshotTarget("design-reference/screenshots/v2/13_Auth_SignIn.png"),
    signUp: screenshotTarget("design-reference/screenshots/v2/14_Auth_SignUp.png"),
    forgotPassword: screenshotTarget("design-reference/screenshots/v2/15_Auth_ForgotPassword.png"),
    taskDetails: v4Target("design-reference/screenshots/v4/17_TaskDetails.png"),
    sessionDetails: v4Target("design-reference/screenshots/v4/18_SessionDetails.png"),
  } satisfies Record<string, VisualTarget>,
} as const;

function liveTarget(reference: string): VisualTarget {
  return { source: "live-superdesign", reference, liveDraftAvailable: true };
}

function sameProjectTarget(reference: string): VisualTarget {
  return { source: "same-project-superdesign", reference, liveDraftAvailable: true };
}

function screenshotTarget(reference: string): VisualTarget {
  return { source: "v2-screenshot", reference, liveDraftAvailable: false };
}

function v4Target(reference: string): VisualTarget {
  return { source: "v4-screenshot", reference, liveDraftAvailable: false };
}
