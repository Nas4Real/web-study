# EXPERIENCE.md - Web Study V1

## Experience goal

The application should feel like one focused academic workspace. The user should be able to move between planning, tasks and files without learning separate mental models.

## Global shell

The existing Superdesign sidebar and dark application shell remain persistent for authenticated screens. Navigation changes routes while preserving the visual shell.

Primary areas:

- Overview/Dashboard
- Calendar
- Tasks
- Documents
- Settings

## Authentication flow

### Email signup

1. User opens Sign Up.
2. User submits valid email/password/profile fields defined by the final design.
3. Account is created but application access remains blocked until email verification succeeds.
4. User sees the designed verification-pending state.
5. Verified link returns to the app/auth callback.
6. User enters the application.

### Google OAuth

1. User selects Continue with Google.
2. Google OAuth completes.
3. Profile is created on first login if absent.
4. User enters the application.

### Password reset

1. User requests reset from Forgot Password.
2. Email contains reset link.
3. Reset callback opens the designed password update state.
4. Successful reset returns to sign in or the authenticated app according to final auth flow.

## Subject flow

- User creates a subject.
- User creates chapters under a subject.
- Each new chapter receives starter folders `Cours`, `TD`, `Resume`.
- These folders are ordinary editable folders and users may rename, add, move, or delete folders.
- Subject color is reused consistently across tasks, calendar and documents.

## Task flow

- Create Task opens the existing task dialog or its finalized Superdesign equivalent.
- Subject is required. The V4 detail state also requires the authoring flow to support normal/high priority, canonical description, and optional ordered subtasks after a Superdesign-first update.
- Clicking a supported task body opens the canonical Task Details dialog; completion controls do not accidentally open it.
- Subtasks can be completed independently. Parent completion does not rewrite subtask completion state.
- Pending tasks appear in the correct date group.
- Completing a task gives immediate UI feedback and moves it to Completed.
- Restoring returns it to the appropriate pending group.
- Dashboard task counts and progress update immediately.

## Calendar flow

- Day/week/month views come from the existing design.
- New Session supports Exam, University/Class and Revision.
- Subject is required.
- A session can be one-time or recurring.
- Editing/deleting a recurring occurrence prompts for scope.
- Current date/period labels are real data, not hard-coded demo dates.
- Clicking an occurrence in Calendar Day/Week or Dashboard Today's Classes opens the same effective-occurrence Session Details dialog. Single-occurrence overrides must already be applied before rendering location, professor, focus and Notes & Reminders.

## Document flow

- Documents landing page shows subjects, recent files and all files using real metadata.
- Opening a subject shows its chapters.
- Opening a chapter shows its folders and files.
- Upload requires subject and may classify into chapter/folder according to the final flow.
- Upload progress and failures are visible.
- Download opens a short-lived private URL.
- Rename/reclassify changes metadata only. It does not depend on R2 path-like folders.

## Notification flow

- Bell opens the designed notifications panel.
- Unread count is visible.
- Opening a notification marks it read and routes to its resource.
- Users can mark items read or unread.

## Settings flow

The main Settings page is now approved for profile, security, notification entry point, storage usage, sign out, and delete-account entry point. Developer/API key details, notification preference editor, and destructive delete confirmation still require approved Superdesign states.

## Error behavior

- Authentication errors stay near the relevant form.
- API validation errors are readable and field-specific where possible.
- Upload errors preserve the user's current context.
- Quota errors state used/quota values and do not start an R2 upload.
- Missing/deleted resources route back safely rather than rendering broken detail views.

## Loading behavior

Preserve layout geometry when possible. Use local loading indicators/skeletons only if they are represented in the finalized design. Do not introduce generic skeleton libraries that alter the visual language.


## V4 detail interactions

Task and session cards now have canonical detail dialogs. Task Details exposes description, priority and independent subtasks. Session Details exposes effective occurrence information and opens from Calendar Day/Week plus Dashboard Today's Classes. Missing authoring controls are designed in live Superdesign first. Modal behavior preserves visual styling while meeting focus/inert/escape/restore accessibility semantics.
