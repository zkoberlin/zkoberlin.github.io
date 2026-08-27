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
  "/alcohol",
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

const ALCOHOL_CATALOG = Object.freeze({
  bier03: { label: "🍺 Bier 0,33l", units: 1.3 },
  bier05: { label: "🍺 Bier 0,5l", units: 2.0 },
  wein02: { label: "🍷 Wein 0,2l", units: 1.9 },
  wein04: { label: "🍷 Wein 0,4l", units: 3.8 },
  schnaps2: { label: "🥃 Schnaps 2cl", units: 0.6 },
  schnaps4: { label: "🥃 Schnaps 4cl", units: 1.3 },
  mix03: { label: "🍹 Mix 0,3l", units: 1.2 },
});

function berlinNow() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date()).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

async function alcoholResponse(request, env, origin) {
  if (request.method === "GET") {
    const result = await env.HUB_DB.prepare(
      "SELECT entry_id AS entryId, occurred_on AS date, occurred_time AS time, drink_code AS drinkCode, label, standard_units AS units FROM alcohol_entries ORDER BY occurred_on, occurred_time, created_at",
    ).all();
    return json({ schemaVersion: 1, entries: result.results ?? [], generatedAt: new Date().toISOString() }, 200, origin);
  }

  if (request.method === "POST") {
    let payload;
    try { payload = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400, origin); }
    const drink = ALCOHOL_CATALOG[String(payload?.drinkCode ?? "")];
    if (!drink) return json({ error: "Invalid drink" }, 400, origin);
    const now = berlinNow();
    const entryId = crypto.randomUUID();
    await env.HUB_DB.prepare(
      "INSERT INTO alcohol_entries (entry_id, occurred_on, occurred_time, drink_code, label, standard_units, source_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).bind(entryId, now.date, now.time, String(payload.drinkCode), drink.label, drink.units, Date.now()).run();
    return json({ entry: { entryId, date: now.date, time: now.time, drinkCode: String(payload.drinkCode), label: drink.label, units: drink.units } }, 201, origin);
  }

  if (request.method === "DELETE") {
    let payload;
    try { payload = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400, origin); }
    const entryId = String(payload?.entryId ?? "");
    if (!/^[a-f0-9-]{32,36}$/i.test(entryId)) return json({ error: "Invalid entry" }, 400, origin);
    await env.HUB_DB.prepare("DELETE FROM alcohol_entries WHERE entry_id = ?").bind(entryId).run();
    return new Response(null, { status: 204, headers: headers(origin) });
  }

  return json({ error: "Method not allowed" }, 405, origin);
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
      responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT, OPTIONS");
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

    if (url.pathname === "/alcohol") {
      try {
        return await alcoholResponse(request, env, origin);
      } catch {
        return json({ error: "Alcohol tracker unavailable" }, 503, origin);
      }
    }

    return env.BACKEND.fetch(request);
  },
};
