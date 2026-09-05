const ALLOWED_ORIGINS = new Set([
  "https://zkoberlin.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
]);

const PRIVATE_PATHS = new Set([
  "/feeds/gmail",
  "/feeds/hellomed",
  "/feeds/kids",
  "/feeds/alma",
  "/feeds/calendar-preview",
  "/calendar-preferences",
  "/finance",
  "/finance-preview",
  "/portfolio-preview",
  "/snapshot",
  "/trailyx-preview",
  "/alcohol",
]);

const PUBLIC_PATHS = new Set(["/horoscope", "/location/reverse"]);
const SESSION_PREFIX = "ps1_";
const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

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

function newSessionToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return SESSION_PREFIX + Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function tokenHash(token) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
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

const CALENDAR_CATEGORY_IDS = new Set(["maja", "birthday", "family", "sport", "culture", "health", "travel", "other"]);
const DEFAULT_CALENDAR_CATEGORIES = ["maja", "birthday", "culture", "health", "travel", "other"];
const FINANCE_STATE_KEY = "primary";
const FINANCE_MAX_BYTES = 100_000;
const FINANCE_BASE_KEYS = ["miete", "strom", "internet", "lebensmittel", "schufa", "ing", "haftpflicht", "rechtsschutz", "kredit", "gez", "unterhalt", "kids", "handyemil", "handyrosa", "ukv", "sparta", "bling", "unionemil", "handypaul", "icloud", "spotify", "finanzguru", "claude", "unionmitgl", "amazon", "parqet", "futbology", "fotmob", "bvg", "dauerkarte", "garmin"];
const FINANCE_CATEGORIES = new Set(["Wohnen", "Versicherungen", "Kredite & Finanzen", "Familie", "Abos", "Freizeit"]);
const FINANCE_ICONS = new Set(['🏠','⚡','💧','🔥','📡','🛒','🛡️','⚖️','💳','🏦','📈','💰','🧾','💶','👨‍👧‍👦','👶','🎓','📱','⌚','🐷','🎵','☁️','🎬','📺','🎮','📰','📚','⚽','🏋️','🚲','🚆','🚌','🚗','✈️','🏨','🗺️','🍽️','☕','🍺','🎟️','🎭','📷','🎨','💇','🩺','💊','🐕','🐈','🎁','✨']);

function validAmount(value) {
  return Number.isFinite(value) && value >= 0 && value <= 10_000_000;
}

function validFinancePayload(payload) {
  if (!payload || payload.v !== 3 || !payload.s || typeof payload.s !== "object" || Array.isArray(payload.s) || !Array.isArray(payload.c)) return false;
  if (Object.keys(payload.s).length > 150 || payload.c.length > 60 || Number.isNaN(Date.parse(payload.ts))) return false;
  for (const [key, item] of Object.entries(payload.s)) {
    if (!/^[a-z0-9_-]{1,64}$/i.test(key) || !item || !validAmount(item.v) || (item.on !== undefined && typeof item.on !== "boolean")) return false;
  }
  return payload.c.every((item) => item && /^[a-z0-9_-]{1,64}$/i.test(item.k) &&
    typeof item.name === "string" && item.name.trim().length > 0 && item.name.length <= 100 &&
    validAmount(item.amt) && validAmount(item.monthly) && ["monthly", "quarterly", "yearly", "annual"].includes(item.freq) &&
    FINANCE_CATEGORIES.has(item.cat) && (item.icon === undefined || FINANCE_ICONS.has(item.icon)));
}

function financePreview(payload, updatedAt) {
  const state = payload.s;
  const income = (state.gehalt?.v || 0) + (state.zusatz?.on ? state.zusatz.v || 0 : 0);
  const costs = FINANCE_BASE_KEYS.reduce((sum, key) => sum + (state[key]?.on === false ? 0 : state[key]?.v || 0), 0) +
    payload.c.reduce((sum, item) => sum + (state[item.k]?.on === false ? 0 : item.monthly || 0), 0);
  const savingsMonthly = (state.invest?.v || 0) + (state.notgr?.v || 0);
  const distributions = savingsMonthly + (state.urlaub?.v || 0) + (state.sonder?.v || 0);
  const buffer = Math.round((income - costs - distributions) * 100) / 100;
  return {
    schemaVersion: 1,
    month: new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit" }).format(new Date()),
    buffer,
    freePercent: income > 0 ? Math.max(0, Math.min(100, Math.round(buffer / income * 100))) : 0,
    savingsRate: income > 0 ? Math.max(0, Math.round(savingsMonthly / income * 100)) : 0,
    savingsMonthly: Math.round(savingsMonthly * 100) / 100,
    updatedAt,
  };
}

async function financeResponse(request, env, origin, previewOnly = false) {
  if (request.method === "GET") {
    const row = await env.HUB_DB.prepare("SELECT payload_json AS payload, updated_at AS updatedAt FROM finance_state WHERE state_key = ?1").bind(FINANCE_STATE_KEY).first();
    if (!row?.payload) return json({ error: "Finance state not found" }, 404, origin);
    const payload = JSON.parse(row.payload);
    return json(previewOnly ? financePreview(payload, row.updatedAt) : payload, 200, origin);
  }
  if (previewOnly || request.method !== "PUT") return json({ error: "Method not allowed" }, 405, origin);
  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (declaredLength > FINANCE_MAX_BYTES) return json({ error: "Payload too large" }, 413, origin);
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > FINANCE_MAX_BYTES) return json({ error: "Payload too large" }, 413, origin);
  let payload;
  try { payload = JSON.parse(body); } catch { return json({ error: "Invalid JSON" }, 400, origin); }
  if (!validFinancePayload(payload)) return json({ error: "Invalid finance state" }, 400, origin);
  await env.HUB_DB.prepare(
    "INSERT INTO finance_state (state_key, payload_json, source_updated_at, updated_at) VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP) ON CONFLICT(state_key) DO UPDATE SET payload_json = excluded.payload_json, source_updated_at = excluded.source_updated_at, updated_at = CURRENT_TIMESTAMP",
  ).bind(FINANCE_STATE_KEY, JSON.stringify(payload), payload.ts).run();
  return json({ saved: true, updatedAt: new Date().toISOString() }, 200, origin);
}

async function calendarPreferencesResponse(request, env, origin) {
  if (request.method === "GET") {
    const row = await env.HUB_DB.prepare("SELECT value_json AS value FROM hub_preferences WHERE preference_key = ?").bind("calendar_categories").first();
    let selected = DEFAULT_CALENDAR_CATEGORIES;
    try {
      const parsed = row?.value ? JSON.parse(row.value) : null;
      if (Array.isArray(parsed) && parsed.every((item) => CALENDAR_CATEGORY_IDS.has(item))) selected = [...new Set(parsed)];
    } catch {}
    return json({ schemaVersion: 1, selected }, 200, origin);
  }
  if (request.method === "PUT") {
    const declaredLength = Number(request.headers.get("Content-Length") || 0);
    if (declaredLength > 2000) return json({ error: "Payload too large" }, 413, origin);
    let payload;
    try { payload = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400, origin); }
    if (!Array.isArray(payload?.selected) || payload.selected.length > CALENDAR_CATEGORY_IDS.size || !payload.selected.every((item) => CALENDAR_CATEGORY_IDS.has(item))) {
      return json({ error: "Invalid categories" }, 400, origin);
    }
    const selected = [...new Set(payload.selected)];
    await env.HUB_DB.prepare(
      "INSERT INTO hub_preferences (preference_key, value_json, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(preference_key) DO UPDATE SET value_json = excluded.value_json, updated_at = CURRENT_TIMESTAMP",
    ).bind("calendar_categories", JSON.stringify(selected)).run();
    return json({ schemaVersion: 1, selected }, 200, origin);
  }
  return json({ error: "Method not allowed" }, 405, origin);
}

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

function validIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
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
    const occurredOn = String(payload?.occurredOn || now.date);
    if (!validIsoDate(occurredOn) || occurredOn > now.date) {
      return json({ error: "Invalid date" }, 400, origin);
    }
    const entryId = crypto.randomUUID();
    await env.HUB_DB.prepare(
      "INSERT INTO alcohol_entries (entry_id, occurred_on, occurred_time, drink_code, label, standard_units, source_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).bind(entryId, occurredOn, now.time, String(payload.drinkCode), drink.label, drink.units, Date.now()).run();
    return json({ entry: { entryId, date: occurredOn, time: now.time, drinkCode: String(payload.drinkCode), label: drink.label, units: drink.units } }, 201, origin);
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

async function verifySessionUser(request, token, env) {
  if (!token.startsWith(SESSION_PREFIX)) return null;
  const hash = await tokenHash(token);
  const bookmark = request.headers.get("X-D1-Bookmark") || "first-primary";
  const database = env.HUB_DB.withSession(bookmark);
  const row = await database.prepare(
    "SELECT email, name, expires_at AS expiresAt FROM hub_sessions WHERE session_hash = ?1 AND expires_at > ?2",
  ).bind(hash, Date.now()).first();
  return row ? { email: String(row.email), name: String(row.name || "") } : null;
}

async function verifyUser(request, env) {
  const token = bearerToken(request);
  if (!token) return null;
  return token.startsWith(SESSION_PREFIX) ? verifySessionUser(request, token, env) : verifyGoogleUser(request, env);
}

async function createSession(request, env, origin) {
  const user = await verifyGoogleUser(request, env);
  if (!user) return json({ error: "Unauthorized" }, 401, origin);
  const token = newSessionToken();
  const hash = await tokenHash(token);
  const expiresAt = Date.now() + SESSION_LIFETIME_MS;
  const database = env.HUB_DB.withSession("first-primary");
  await database.prepare("DELETE FROM hub_sessions WHERE expires_at <= ?1").bind(Date.now()).run();
  await database.prepare(
    "INSERT INTO hub_sessions (session_hash, email, name, expires_at) VALUES (?1, ?2, ?3, ?4)",
  ).bind(hash, user.email, user.name, expiresAt).run();
  return json({ sessionToken: token, sessionBookmark: database.getBookmark(), expiresAt, user }, 201, origin);
}

async function deleteSession(request, env, origin) {
  const token = bearerToken(request);
  if (!token.startsWith(SESSION_PREFIX)) return json({ error: "Unauthorized" }, 401, origin);
  await env.HUB_DB.prepare("DELETE FROM hub_sessions WHERE session_hash = ?1").bind(await tokenHash(token)).run();
  return new Response(null, { status: 204, headers: headers(origin) });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      if (!ALLOWED_ORIGINS.has(origin)) return json({ error: "Origin not allowed" }, 403, origin);
      const responseHeaders = headers(origin);
      responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT, OPTIONS");
      responseHeaders.set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-D1-Bookmark");
      responseHeaders.set("Access-Control-Max-Age", "86400");
      return new Response(null, { status: 204, headers: responseHeaders });
    }

    if (origin && !ALLOWED_ORIGINS.has(origin)) return json({ error: "Origin not allowed" }, 403, origin);

    if (url.pathname === "/auth/session") {
      if (request.method === "POST") return createSession(request, env, origin);
      if (request.method === "DELETE") return deleteSession(request, env, origin);
      return json({ error: "Method not allowed" }, 405, origin);
    }

    if (url.pathname === "/auth/me" && request.method === "GET") {
      const user = await verifyUser(request, env);
      return user
        ? json({ authenticated: true, user }, 200, origin)
        : json({ error: "Unauthorized" }, 401, origin);
    }

    if (PRIVATE_PATHS.has(url.pathname)) {
      const user = await verifyUser(request, env);
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

    if (url.pathname === "/calendar-preferences") {
      try {
        return await calendarPreferencesResponse(request, env, origin);
      } catch {
        return json({ error: "Calendar preferences unavailable" }, 503, origin);
      }
    }

    if (url.pathname === "/finance" || url.pathname === "/finance-preview") {
      try {
        return await financeResponse(request, env, origin, url.pathname === "/finance-preview");
      } catch {
        return json({ error: "Finance storage unavailable" }, 503, origin);
      }
    }

    return env.BACKEND.fetch(request);
  },
};
