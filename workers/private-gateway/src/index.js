const ALLOWED_ORIGINS = new Set([
  "https://zkoberlin.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
]);

const PRIVATE_PATHS = new Set([
  "/feeds/gmail",
  "/feeds/hellomed",
  "/feeds/kids",
  "/snapshot",
]);

const PUBLIC_PATHS = new Set(["/horoscope", "/market/quote", "/market/metric", "/market/yahoo"]);

function headers(origin) {
  const result = new Headers({
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    Vary: "Origin",
  });
  if (ALLOWED_ORIGINS.has(origin)) result.set("Access-Control-Allow-Origin", origin);
  return result;
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), { status, headers: headers(origin) });
}

function bearerToken(request) {
  return (request.headers.get("Authorization") || "").match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
}

async function verifyGoogleUser(request, env) {
  const token = bearerToken(request);
  if (!token) return null;
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  const profile = await response.json();
  const email = String(profile?.email || "").toLowerCase();
  if (!profile?.email_verified || email !== String(env.ALLOWED_GOOGLE_EMAIL || "").toLowerCase()) return null;
  return { email, name: profile?.name || "" };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      if (!ALLOWED_ORIGINS.has(origin)) return json({ error: "Origin not allowed" }, 403, origin);
      const responseHeaders = headers(origin);
      responseHeaders.set("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
      responseHeaders.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
      responseHeaders.set("Access-Control-Max-Age", "86400");
      return new Response(null, { status: 204, headers: responseHeaders });
    }

    if (origin && !ALLOWED_ORIGINS.has(origin)) return json({ error: "Origin not allowed" }, 403, origin);

    if (url.pathname === "/auth/me" && request.method === "GET") {
      const user = await verifyGoogleUser(request, env);
      return user
        ? json({ authenticated: true, user }, 200, origin)
        : json({ error: "Unauthorized" }, 401, origin);
    }

    if (PRIVATE_PATHS.has(url.pathname)) {
      const user = await verifyGoogleUser(request, env);
      if (!user) return json({ error: "Unauthorized" }, 401, origin);
    } else if (!PUBLIC_PATHS.has(url.pathname)) {
      return json({ error: "Not found" }, 404, origin);
    }

    return env.BACKEND.fetch(request);
  },
};
