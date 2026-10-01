export type AuthActor = Readonly<{
  userId: string;
}>;

type ClaimsResult = {
  data: {
    claims?: { sub?: unknown } | null;
  } | null;
  error: unknown;
};

export async function resolveVerifiedActor(
  getClaims: () => Promise<ClaimsResult>,
): Promise<AuthActor | null> {
  try {
    const { data, error } = await getClaims();
    const subject = data?.claims?.sub;

    if (error || typeof subject !== "string" || subject.length === 0) {
      return null;
    }

    return { userId: subject };
  } catch {
    return null;
  }
}
