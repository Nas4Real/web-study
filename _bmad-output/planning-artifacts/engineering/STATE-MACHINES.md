# State Machines V4

## Parent task

```text
pending <-> completed
   \
    -> someday -> pending
```

`completed` sets `completed_at`; leaving completed clears it. Subtask state is independent and is not rewritten by parent transitions.

## Subtask

```text
incomplete <-> complete
```

Completion is represented by nullable `completed_at`.

## File upload

```text
pending -> ready
   |        |
   v        v
 failed   deleting -> deleted
```

Quota reservation belongs to pending intent and is reconciled on ready/failure/expiry.

## Calendar occurrence

```text
generated from series
  |-- no exception -> effective base occurrence
  |-- modified exception -> effective overridden occurrence
  |-- cancelled exception -> not rendered / cancelled detail
```

The stable occurrence key remains `original_start` even when effective start changes.

## API key

```text
active -> revoked
  |
  -> expired (time condition)
```

Raw token exists only at creation response time.
