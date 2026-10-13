# Hosted navigation smoke — 2026-10-10

## Environment and scope

Protected preview: https://web-study-hnb1od8u3-nas-9c1f.vercel.app

Application commit: `e6c5b958e1e1b9f367cc6500bba309b0b7078dd1`.
The subsequent `7c8bbef` changes diagnostic tooling/documentation only; this
report does not claim inspection of its separate automatic deployment.
Codex in-app browser, existing Vercel-authorized session, dedicated verified
populated synthetic account, desktop 1440x900 and mobile 320x812.

Ignored local test credentials were loaded directly into the browser-control
runtime without displaying them, then entered through normal app sign-in.
Credential variables were cleared after submission. No duplicate accounts,
password changes, authentication bypass or Vercel protection changes. No study
records were edited, and no real-user account was used.

## Observed results

Sign-in succeeds and Dashboard displays the synthetic workspace.

| Destination | Desktop sidebar content | Mobile keyboard search content |
| --- | --- | --- |
| Dashboard | Today's summary and synthetic tasks/sessions | Pass; Loading Dashboard observed |
| Tasks | Synthetic assignments and task-status controls | Pass; Loading Tasks observed |
| Calendar | View controls and synthetic week occurrences | Pass; Loading Calendar observed |
| Documents | Subject organization; upload explicitly disabled | Pass; Loading Documents observed |
| Settings | Profile, subjects and explicit deferred controls | Pass; Loading Settings observed |

Each mobile destination shows its correct loading status before completed
content. Completed mobile states retain navigation-search focus and have no
page-level horizontal overflow (`document.documentElement.scrollWidth <= innerWidth`).
This does not imply that every nested horizontal control displays every item
simultaneously. Dashboard's visible heading is Overview; its Today's summary
region establishes readiness (an initial Dashboard-heading assertion was wrong).

Desktop back/forward between Documents and Settings returns correct content.
Mobile back/forward between Settings and Dashboard succeeds. Mobile Calendar
navigation followed by Tasks while Calendar's loading status is visible ends on
Tasks with correct content, retained search focus and no overflow. This natural
competing-navigation smoke check is distinct from the deterministic local held
response regression.

No warning/error console entries are captured at either end-of-route check.
Viewport override reset afterward; the task-created preview tab is retained for
continued verification. Unrelated user tabs remain untouched. Screenshot proof
stays ignored: `.performance-artifacts/hosted-preview-tasks-mobile.png`.

## Limits and verdict

Hosted signed-in navigation smoke is verified; story 09-03 remains in progress.
These observations are not comparable click-to-content samples, p95, hosted
provider attribution, stream-body completion, a global prefetch bound or
usable-content non-regression. The isolated profiler still encounters Vercel
protection; no cookies/tokens were exported. Initial-layout/auth timing and
actual-content tails remain open alongside the controlled timing gates.

No source/UI changes, merge or production deployment in this slice. Prior local
automated quality gates are referenced, not claimed as rerun for a documentation
update.
