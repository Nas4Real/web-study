# Accessibility and Performance Test Specification V4

## Accessibility

- A11Y-001 modal outside content is inert while open.
- A11Y-002 opening a modal moves focus inside; Tab/Shift+Tab remain inside.
- A11Y-003 Escape closes non-destructive detail modal and focus returns to exact invoker.
- A11Y-004 dialog has accessible name tied to visible title or equivalent label.
- A11Y-005 icon-only controls have names and visible focus.
- A11Y-006 form errors are associated with fields.
- A11Y-007 selected tabs/calendar/task states expose semantics; color alone is not the only critical-state signal.
- A11Y-008 subtask checkboxes expose checked state and usable labels.

## Performance

- PERF-001 dashboard avoids N+1 queries.
- PERF-002 calendar range queries use indexed user/time filters and bounded recurrence expansion.
- PERF-003 opening detail does not refetch every dashboard/list resource unnecessarily; keyed cache may be reused.
- PERF-004 document lists adopt pagination/cursor before unbounded growth.
- PERF-005 50 MB file bytes never transit normal Next.js JSON path.
- PERF-006 authenticated routes are not publicly cached with user-specific content.
