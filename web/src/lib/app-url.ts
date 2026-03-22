export function getAppUrl() {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_APP_URL");
  }
  return url.replace(/\/$/, "");
}
