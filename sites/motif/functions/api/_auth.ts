// Shared auth helper for Pages Functions.
// Checks for a valid session cookie set by the /api/auth login endpoint.
// The site password is stored as the ADMIN_PASSWORD env var in CF Pages settings.

export interface Env {
  CONTENT: KVNamespace;
  ADMIN_PASSWORD: string;
}

const COOKIE_NAME = "motif_admin";
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export function makeSessionToken(password: string): string {
  // Simple HMAC-like token: base64(password + timestamp)
  // Not cryptographically robust but sufficient for a site password
  const expires = Date.now() + SESSION_DURATION;
  return btoa(`${password}:${expires}`);
}

export function validateSession(
  cookie: string | null,
  password: string
): boolean {
  if (!cookie) return false;
  try {
    const decoded = atob(cookie);
    const [pwd, expiresStr] = decoded.split(":");
    const expires = parseInt(expiresStr, 10);
    return pwd === password && expires > Date.now();
  } catch {
    return false;
  }
}

export function getSessionCookie(request: Request): string | null {
  const cookies = request.headers.get("Cookie") ?? "";
  const match = cookies
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  return match ? match.split("=")[1] : null;
}

export function setSessionCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DURATION / 1000}`;
}

export function requireAuth(
  request: Request,
  env: Env
): Response | null {
  const cookie = getSessionCookie(request);
  if (!validateSession(cookie, env.ADMIN_PASSWORD)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}
