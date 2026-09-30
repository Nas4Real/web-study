# Architecture Decision Records - Web Study V4

## ADR-001 Live Superdesign is the UI authority

**Decision:** Codex reads the live existing project; no user export is required. Existing approved states are immutable unless Nas changes them. Missing required states are created in the same project first.

**Why:** prevents drift introduced by screenshot-only reconstruction and keeps implementation aligned with the actual editable design.

## ADR-002 Tailwind major follows design parity

**Decision:** initial implementation pins the Tailwind major used by the live Superdesign output. Do not force v4 during the exact-port phase.

**Why:** Tailwind v4 has breaking utility/Preflight changes including rings, placeholders, button cursor and dialog margins. A framework migration and a design port are separate risk domains.

## ADR-003 Task subtasks are relational rows

**Decision:** store subtasks in `task_subtasks`, not a JSON array.

**Why:** they have independent identity/completion, need secure nested API mutations, ordering, RLS/ownership tests, and efficient targeted updates.

## ADR-004 Task priority starts with normal/high

**Decision:** V1 supports `normal|high` only.

**Why:** high priority is evidenced by the approved detail UI; extra tiers would be invented product semantics.

## ADR-005 Session Notes & Reminders are ordered JSON content

**Decision:** `calendar_series.notes_items` is an ordered JSON array of strings and occurrence overrides may replace it inside `override_payload`.

**Why:** notes are small ordered value content, not independent entities. Keeping them with the series makes single-occurrence override semantics straightforward and avoids an unnecessary child-table/override model.

## ADR-006 Recurring occurrence identity is original start

**Decision:** `{series_id, original_start}` is stable occurrence identity.

**Why:** matches RFC 5545 RECURRENCE-ID semantics, where an occurrence retains the original DTSTART identity even when moved.

## ADR-007 R2 uses single PUT for V1 uploads

**Decision:** use direct presigned single PUT for <=50 MB files.

**Why:** Cloudflare documents single PUT as appropriate for small/medium objects under ~100 MB. Multipart adds resumability but is unnecessary complexity under the current 50 MB cap.

## ADR-008 Explicit grants + RLS

**Decision:** migrations explicitly grant user-facing Data API privileges and separately configure RLS.

**Why:** Supabase's 2026 Data API exposure change makes explicit grants required/default for new tables. Grants answer “can this role reach the table”; RLS answers “which rows can it reach.”
