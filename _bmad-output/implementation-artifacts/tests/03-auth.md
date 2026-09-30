# Authentication Test Specification

## Cases

- AUTH-001: email/password sign-up creates account and requires email verification before app access.
- AUTH-002: verified password user can sign in and reach protected routes.
- AUTH-003: unverified password user is redirected to the verification state.
- AUTH-004: Google OAuth callback establishes the expected authenticated session.
- AUTH-005: Apple auth is not offered or accepted in V1.
- AUTH-006: forgot-password request succeeds without leaking whether an address exists.
- AUTH-007: reset link/code flow reaches set-new-password state and updates password.
- AUTH-008: sign out clears access to protected routes.
- AUTH-009: protected server routes validate claims/user identity, not an untrusted cookie user object alone.
- AUTH-010: authenticated responses that refresh sessions are not publicly cached.
