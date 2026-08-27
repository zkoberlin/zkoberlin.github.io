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
  "/trailyx-preview",
]);

const PUBLIC_PATHS = new Set(["/horoscope", "/market/quote", "/market/metric", "/market/yahoo", "/location/reverse"]);

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

function validTrailyxPreview(data) {
  const validTrip = (trip) => trip === null || (
    trip && typeof trip.destinationCity === "string" && typeof trip.destinationCountry === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(trip.startDate) && /^\d{4}-\d{2}-\d{2}$/.test(trip.endDate) &&
    (data?.schemaVersion === 1 || (
      Number.isInteger(trip.distanceKm) && trip.distanceKm >= 0 &&
      Array.isArray(trip.transportModes) && trip.transportModes.length <= 8 &&
      trip.transportModes.every((mode) => typeof mode === "string" && mode.length > 0 && mode.length <= 40)
    ))
  );
  const stats = data?.stats;
  return (data?.schemaVersion === 1 || data?.schemaVersion === 2) && Number.isInteger(data?.year) &&
    validTrip(data?.nextTrip) && validTrip(data?.lastTrip) &&
    stats && [stats.distanceKm, stats.trips, stats.countries, stats.cities]
      .every((value) => Number.isInteger(value) && value >= 0) &&
    !Number.isNaN(Date.parse(data?.generatedAt));
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

    if (url.pathname === "/trailyx-preview") {
      if (request.method !== "GET") return json({ error: "Method not allowed" }, 405, origin);
      try {
        const response = await env.TRAILYX.fetch(new Request("https://trailyx.internal/internal/hub-preview", {
          headers: { "X-Hub-Preview-Key": env.HUB_PREVIEW_SECRET },
        }));
        if (!response.ok) return json({ error: "TrailYX preview unavailable" }, 502, origin);
        const data = await response.json();
        return validTrailyxPreview(data)
          ? json(data, 200, origin)
          : json({ error: "TrailYX preview unavailable" }, 502, origin);
      } catch {
        return json({ error: "TrailYX preview unavailable" }, 502, origin);
      }
    }

    return env.BACKEND.fetch(request);
  },
};
