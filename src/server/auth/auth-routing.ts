const WORKSPACE_ROOTS = ["/tasks", "/calendar", "/documents", "/settings"] as const;

export function isProtectedWorkspacePath(pathname: string) {
  if (pathname === "/") return true;

  return WORKSPACE_ROOTS.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function buildSignInUrl(requestUrl: URL) {
  const signInUrl = new URL("/sign-in", requestUrl.origin);
  signInUrl.searchParams.set("next", `${requestUrl.pathname}${requestUrl.search}`);
  return signInUrl;
}

type E2eAuthenticationInput = {
  nodeEnv: string | undefined;
  configuredToken: string | undefined;
  requestToken: string | null | undefined;
};

export function isE2eAuthenticatedRequest({
  nodeEnv,
  configuredToken,
  requestToken,
}: E2eAuthenticationInput) {
  return (
    nodeEnv !== "production" &&
    Boolean(configuredToken) &&
    requestToken === configuredToken
  );
}
