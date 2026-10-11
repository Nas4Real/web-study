# Active: Copy the localhost UI

- [x] Identify live Vite source and confirm matching `web/app/src` files.
- [x] Compare source and working app; record source mapping and preserved behavior.
- [x] Copy shell/tokens and all Dashboard components; browser + regression verification.
- [x] Copy Tasks screen; verify filters, keyboard details, action menu and creation entry point.
- [ ] Copy Calendar views/header; verify day/week/month and session actions.
- [ ] Copy Documents screens; verify subjects/chapters/search and disabled uploads.
- [ ] Compare/port remaining Settings, dialogs and auth differences.
- [ ] Publish verified UI slices to the existing preview branch.

Full plan: [LOCALHOST-UI-PARITY](../.agent/execplans/LOCALHOST-UI-PARITY.md).

---

# Historical: Navigation and interaction performance (remaining work deferred)

- [x] Prepare Epic 09 spec, seven stories, ExecPlan and sprint/task indexes.
- [ ] 09-01: Record authenticated production baseline and ranked bottlenecks.
- [ ] 09-02: Deduplicate request reads and measure the result.
- [ ] 09-03: Add immediate navigation feedback/prefetch and measure the result.
- [ ] 09-04: Synchronize caches and reduce redundant refreshes.
- [ ] 09-05: Record Calendar client-query implement/defer verdict; execute if justified.
- [ ] 09-06: Record Tasks client-query implement/defer verdict; execute if justified.
- [ ] 09-07: Verify before/after results, regression gates and hosted release.

Full plan: [EPIC-09](../.agent/execplans/EPIC-09.md).

---

# Completed: Signed-in usability fixes

- [x] Add tested owner-scoped subject creation action.
- [x] Add Settings subject creation/list UI.
- [x] Add empty-subject guidance to Task and Session forms.
- [x] Load real shell identity and remove demo profile data.
- [x] Add mobile navigation.
- [x] Implement keyboard-accessible navigation search.
- [x] Disable document upload controls clearly.
- [x] Add tested chapter creation from subject view.
- [x] Fix empty calendar greeting.
- [x] Run focused tests after each slice.
- [x] Run lint, typecheck, full tests, and build.
- [x] Verify desktop/mobile flows in the browser and review the diff.
