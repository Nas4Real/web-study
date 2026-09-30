# Authentication Engineering

## Sign up with email/password

1. Validate full name, email, password client/server.
2. Call Supabase sign-up with redirect URL for verification callback.
3. User remains unauthenticated/unverified for protected application access until verification succeeds.
4. On callback, establish the SSR cookie session and ensure a profile exists.
5. Redirect to dashboard.

The exact pending-verification UI requires approved Superdesign if it is not represented in current screens.

## Google OAuth

1. Start Supabase OAuth with Google using PKCE/SSR flow.
2. Callback exchanges code for session.
3. Create/update minimal profile record.
4. Redirect to dashboard.

## Sign in

Use email/password or Google. Do not implement Apple despite old visible buttons.

## Forgot password

1. User submits email.
2. Supabase sends reset link.
3. Reset callback establishes recovery session.
4. User sets new password on an approved reset form/state.

The provided Forgot Password screen is the request-link state. If the post-link new-password screen is not in Superdesign, visual implementation waits for design.

## SSR protection

Use request-scoped Supabase clients and the current official SSR cookie-refresh approach. Protected routes verify identity/claims before reading user data. Do not trust an unverified user object from raw cookies for authorization.

## Sign out

Revoke local session through Supabase signOut and redirect to sign-in. The profile dropdown and Settings both call the same server action/service path.
