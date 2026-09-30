# Engineering Contract - Task and Session Detail Views

## 1. Goal

Provide one canonical detail experience per entity and reuse it from the approved launch surfaces without duplicating domain rules.

## 2. Task Details

### Launch surfaces

- Tasks page row/card body
- Dashboard task/upcoming-assignment surfaces when live Superdesign indicates clickability

A checkbox is a direct action and must stop propagation so it does not also open details.

### Read model

`TaskDetailDTO`:

```text
id, title, description, priority, status, due_at, completed_at
subject { id, name, color }
subtasks [{ id, title, position, completed_at }]
```

### Mutation behavior

- subtask checkbox toggles only that subtask; optimistic update allowed with rollback
- Complete marks parent completed and sets `completed_at`; it does not auto-complete subtasks
- Reopen clears parent `completed_at`; subtask states remain unchanged
- Delete removes parent and cascaded subtasks after approved confirmation behavior

### Cache

Recommended key `['task', taskId]`. Mutations update/invalidates detail plus affected task/dashboard list keys.

## 3. Session Details

### Launch surfaces

- Calendar Day session card
- Calendar Week session card
- Dashboard Today's Classes/session row

Month behavior is intentionally unspecified unless live Superdesign defines it.

### Stable identity

Use `{seriesId, originalStart}`. For a one-time session, `originalStart` equals the original series start. For recurring sessions it is the generated occurrence's original DTSTART identity.

### Effective detail algorithm

1. authorize/load series by `seriesId`
2. confirm requested `originalStart` belongs to the recurrence set/range policy
3. load matching exception
4. if cancelled, return occurrence-not-found/cancelled semantics
5. generate base occurrence start/end
6. overlay allowed `override_payload` fields
7. return subject display metadata + recurrence metadata

`CalendarOccurrenceDetailDTO` includes title, kind, effective start/end, subject, location, professor, focus text, ordered notes items, recurrence flag, and stable original-start identity.

### Edit/delete

- one-time: edit/delete direct
- recurring occurrence: require scope selection
- `this occurrence`: upsert exception override/cancellation
- `entire series`: mutate/delete series master and invalidate bounded range caches

### Cache

Recommended key `['session-occurrence', seriesId, originalStart]`. Invalidate affected day/week/month/dashboard range keys after mutation.

## 4. Modal behavior

Visual markup is taken from live Superdesign. Implementation must also satisfy dialog semantics: outside content inert, focus remains within dialog, Escape closes when non-destructive, visible close control, and focus returns to the exact invoker.

## 5. Authoring gap

The detail UI is approved but older New Task/New Session forms do not expose all fields. Stories 03-05 and 04-07 are `ready-superdesign-first`: Codex must design those authoring/edit states in the same project before coding them.
