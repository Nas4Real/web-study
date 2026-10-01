export function getAppOrigin(source = process.env.NEXT_PUBLIC_APP_ORIGIN) {
  if (!source) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXT_PUBLIC_APP_ORIGIN is required in production");
    }
    return "http://localhost:3000";
  }

  const url = new URL(source);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("NEXT_PUBLIC_APP_ORIGIN must use HTTP or HTTPS");
  }
  return url.origin;
}
