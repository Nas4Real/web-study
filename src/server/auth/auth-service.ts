import {
  normalizeInternalPath,
  passwordResetRequestInputSchema,
  passwordUpdateInputSchema,
  signInInputSchema,
  signUpInputSchema,
} from "./auth-input";

type ProviderResult = Readonly<{ errorCode: string | null }>;

export type AuthIdentity = Readonly<{
  id: string;
  displayName: string;
}>;

export type AuthGateway = Readonly<{
  signUp(input: {
    fullName: string;
    email: string;
    password: string;
  }): Promise<ProviderResult>;
  signInWithPassword(input: {
    email: string;
    password: string;
  }): Promise<
    ProviderResult & {
      user: { emailConfirmedAt: string | null } | null;
    }
  >;
  createGoogleAuthorization(input: {
    next: string;
  }): Promise<ProviderResult & { url: string | null }>;
  exchangeCodeForSession(code: string): Promise<ProviderResult>;
  getVerifiedIdentity(): Promise<
    ProviderResult & { identity: AuthIdentity | null }
  >;
  ensureProfile(identity: AuthIdentity): Promise<ProviderResult>;
  requestPasswordReset(input: { email: string }): Promise<ProviderResult>;
  updatePassword(input: { password: string }): Promise<ProviderResult>;
  signOut(): Promise<ProviderResult>;
}>;

export type AuthActionState =
  | Readonly<{ status: "idle"; code: "IDLE"; message: "" }>
  | Readonly<{
      status: "error";
      code:
        | "INVALID_INPUT"
        | "SIGN_UP_FAILED"
        | "AUTHENTICATION_FAILED"
        | "OAUTH_FAILED"
        | "CALLBACK_FAILED"
        | "PASSWORD_RESET_FAILED"
        | "RECOVERY_SESSION_REQUIRED"
        | "PASSWORD_UPDATE_FAILED"
        | "PROVIDER_UNAVAILABLE";
      message: string;
    }>
  | Readonly<{
      status: "success";
      code:
        | "VERIFICATION_REQUIRED"
        | "PASSWORD_RESET_REQUESTED"
        | "PASSWORD_UPDATED";
      message: string;
    }>;

type RedirectResult = Readonly<{
  status: "success";
  code: "SIGNED_IN" | "OAUTH_REDIRECT" | "CALLBACK_COMPLETE" | "SIGNED_OUT";
  redirectTo: string;
}>;

const INVALID_INPUT: AuthActionState = {
  status: "error",
  code: "INVALID_INPUT",
  message: "Check your information and try again.",
};

const AUTHENTICATION_FAILED: AuthActionState = {
  status: "error",
  code: "AUTHENTICATION_FAILED",
  message: "Email or password is incorrect, or the account is not verified.",
};

const PROVIDER_UNAVAILABLE: AuthActionState = {
  status: "error",
  code: "PROVIDER_UNAVAILABLE",
  message: "Authentication is temporarily unavailable. Please try again.",
};

function publicError(
  code:
    | "SIGN_UP_FAILED"
    | "OAUTH_FAILED"
    | "CALLBACK_FAILED"
    | "PASSWORD_RESET_FAILED"
    | "RECOVERY_SESSION_REQUIRED"
    | "PASSWORD_UPDATE_FAILED",
  message: string,
): AuthActionState {
  return { status: "error", code, message };
}

function isAuthorizationUrl(value: string | null): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export const INITIAL_AUTH_STATE: AuthActionState = {
  status: "idle",
  code: "IDLE",
  message: "",
};

export class AuthService {
  constructor(private readonly gateway: AuthGateway) {}

  async signUp(input: unknown): Promise<AuthActionState> {
    const parsed = signUpInputSchema.safeParse(input);
    if (!parsed.success) return INVALID_INPUT;

    try {
      const result = await this.gateway.signUp(parsed.data);
      if (result.errorCode) {
        return publicError(
          "SIGN_UP_FAILED",
          "We could not create the account. Please try again.",
        );
      }

      return {
        status: "success",
        code: "VERIFICATION_REQUIRED",
        message: "Check your email to verify your account.",
      };
    } catch {
      return PROVIDER_UNAVAILABLE;
    }
  }

  async signIn(input: unknown): Promise<AuthActionState | RedirectResult> {
    const parsed = signInInputSchema.safeParse(input);
    if (!parsed.success) return INVALID_INPUT;

    try {
      const result = await this.gateway.signInWithPassword(parsed.data);
      if (result.errorCode || !result.user?.emailConfirmedAt) {
        return AUTHENTICATION_FAILED;
      }

      return { status: "success", code: "SIGNED_IN", redirectTo: "/" };
    } catch {
      return PROVIDER_UNAVAILABLE;
    }
  }

  async startGoogle(next: string | null | undefined): Promise<AuthActionState | RedirectResult> {
    try {
      const result = await this.gateway.createGoogleAuthorization({
        next: normalizeInternalPath(next),
      });
      if (result.errorCode || !isAuthorizationUrl(result.url)) {
        return publicError(
          "OAUTH_FAILED",
          "Google sign in could not be started. Please try again.",
        );
      }

      return {
        status: "success",
        code: "OAUTH_REDIRECT",
        redirectTo: result.url,
      };
    } catch {
      return PROVIDER_UNAVAILABLE;
    }
  }

  async requestPasswordReset(input: unknown): Promise<AuthActionState> {
    const parsed = passwordResetRequestInputSchema.safeParse(input);
    if (!parsed.success) return INVALID_INPUT;

    try {
      const result = await this.gateway.requestPasswordReset(parsed.data);
      if (result.errorCode) {
        return publicError(
          "PASSWORD_RESET_FAILED",
          "We could not send a reset link. Please try again later.",
        );
      }
      return {
        status: "success",
        code: "PASSWORD_RESET_REQUESTED",
        message: "If an account exists for that email, a reset link is on its way.",
      };
    } catch {
      return PROVIDER_UNAVAILABLE;
    }
  }

  async updatePassword(input: unknown): Promise<AuthActionState> {
    const parsed = passwordUpdateInputSchema.safeParse(input);
    if (!parsed.success) return INVALID_INPUT;

    try {
      const identity = await this.gateway.getVerifiedIdentity();
      if (identity.errorCode || !identity.identity) {
        return publicError(
          "RECOVERY_SESSION_REQUIRED",
          "Open a valid password reset link and try again.",
        );
      }

      const update = await this.gateway.updatePassword({
        password: parsed.data.password,
      });
      if (update.errorCode) {
        return publicError(
          "PASSWORD_UPDATE_FAILED",
          "Your password could not be updated. Please try again.",
        );
      }

      return {
        status: "success",
        code: "PASSWORD_UPDATED",
        message: "Your password has been updated.",
      };
    } catch {
      return PROVIDER_UNAVAILABLE;
    }
  }

  async completeCallback(
    code: string | null | undefined,
    next: string | null | undefined,
  ): Promise<AuthActionState | RedirectResult> {
    if (!code || code.length > 4096) {
      return publicError("CALLBACK_FAILED", "The sign-in link is invalid or expired.");
    }

    try {
      const exchange = await this.gateway.exchangeCodeForSession(code);
      if (exchange.errorCode) {
        await this.gateway.signOut();
        return publicError("CALLBACK_FAILED", "The sign-in link is invalid or expired.");
      }

      const identity = await this.gateway.getVerifiedIdentity();
      if (identity.errorCode || !identity.identity) {
        await this.gateway.signOut();
        return publicError("CALLBACK_FAILED", "The sign-in link is invalid or expired.");
      }

      const profile = await this.gateway.ensureProfile(identity.identity);
      if (profile.errorCode) {
        await this.gateway.signOut();
        return publicError(
          "CALLBACK_FAILED",
          "Your account could not be prepared. Please try again.",
        );
      }

      return {
        status: "success",
        code: "CALLBACK_COMPLETE",
        redirectTo: normalizeInternalPath(next),
      };
    } catch {
      try {
        await this.gateway.signOut();
      } catch {
        // Preserve the stable public failure even when cleanup also fails.
      }
      return PROVIDER_UNAVAILABLE;
    }
  }

  async signOut(): Promise<AuthActionState | RedirectResult> {
    try {
      const result = await this.gateway.signOut();
      if (result.errorCode) return PROVIDER_UNAVAILABLE;
      return { status: "success", code: "SIGNED_OUT", redirectTo: "/sign-in" };
    } catch {
      return PROVIDER_UNAVAILABLE;
    }
  }
}
