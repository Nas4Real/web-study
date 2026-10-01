# Extractable Components

## StudySidebar

- Source: `src/features/shell/study-sidebar.tsx`
- Purpose: persistent Web Study navigation shell.
- Active state is derived from the current pathname.
- Superdesign component: `StudySidebar`, component ID `3af6dee6-4a14-41d2-813e-b5a73c042130`.

Dashboard cards remain page-owned components for now. Extract them only when a later approved screen reuses the same structure.

## ModalFrame

- Source: `src/components/modal-frame.tsx`
- Purpose: consistent approved workspace-dialog shell.
- Owns labeling, Escape dismissal, body-scroll locking, initial close-button focus, and focus restoration.
