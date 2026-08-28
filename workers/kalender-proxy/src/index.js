const PRODUCTION_ORIGIN = "https://zkoberlin.github.io";
const DEVELOPMENT_ORIGINS = new Set([
  "http://localhost:8000",
  "http://127.0.0.1:8000",
]);
const FINNHUB_SYMBOLS = new Set([
  "MSFT", "GOOGL", "ASML", "NVO", "PG", "WTKWY", "MELI", "SIEGY",
  "HVRRF", "RACE", "NU", "CTAS", "AXP", "HESAY", "NFLX", "ZTS",
]);
const YAHOO_SYMBOLS = new Set([
  ...FINNHUB_SYMBOLS,
  "DB1.DE", "LOTB.BR", "WKL.AS", "SIE.DE", "HNR1.DE", "RMS.PA", "BKW.SW",
]);
const PRIVATE_PATHS = new Set([
  "/feeds/gmail",
  "/feeds/hellomed",
  "/feeds/kids",
  "/feeds/alma",
  "/feeds/calendar-preview",
  "/snapshot",
]);

function isAllowedOrigin(origin) {
  return !origin || origin === PRODUCTION_ORIGIN || DEVELOPMENT_ORIGINS.has(origin);
}

function responseHeaders(origin, contentType = "application/json; charset=utf-8") {
  const headers = new Headers({
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    Vary: "Origin",
  });

  if (origin && isAllowedOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return headers;
}

function jsonResponse(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: responseHeaders(origin),
  });
}

function berlinDateParts(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "2-digit",
  }).formatToParts(now).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  const monthNumber = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    month: "2-digit",
  }).format(now);
  return {
    key: `${parts.year}-${monthNumber}-${parts.day}`,
    label: `${parts.weekday}, ${Number(parts.day)}. ${parts.month} ${parts.year}`,
  };
}

function normalizeHoroscopeText(value) {
  if (typeof value !== "string") return "";
  const text = value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
  return text.length >= 20 && text.length <= 500 ? text : "";
}

function horoscopeResponse(data, origin) {
  const headers = responseHeaders(origin);
  headers.set("Cache-Control", "public, max-age=300");
  return new Response(JSON.stringify(data), { status: 200, headers });
}

function marketResponse(data, origin, state, storedAt) {
  const headers = responseHeaders(origin);
  headers.set("Access-Control-Expose-Headers", "X-Market-Data, X-Market-Stored-At");
  headers.set("X-Market-Data", state);
  if (storedAt) headers.set("X-Market-Stored-At", String(storedAt));
  return new Response(JSON.stringify(data), { status: 200, headers });
}

function preflightResponse(origin) {
  if (!isAllowedOrigin(origin)) {
    return jsonResponse({ error: "Origin not allowed" }, 403, origin);
  }

  const headers = responseHeaders(origin);
  headers.set("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  headers.set("Access-Control-Max-Age", "86400");
  return new Response(null, { status: 204, headers });
}

function getBearerToken(request) {
  const authorization = request.headers.get("Authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

async function verifyGoogleUser(request, env) {
  const token = getBearerToken(request);
  if (!token) return null;

  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;

  const profile = await response.json();
  const email = String(profile?.email || "").toLowerCase();
  const allowedEmail = String(env.ALLOWED_GOOGLE_EMAIL || "").toLowerCase();
  if (!profile?.email_verified || !email || email !== allowedEmail) return null;

  return { email, name: profile?.name || "" };
}

async function handleAuthMe(request, env, origin) {
  const user = await verifyGoogleUser(request, env);
  if (!user) return jsonResponse({ error: "Unauthorized" }, 401, origin);
  return jsonResponse({ authenticated: true, user }, 200, origin);
}

function getFeedUrl(pathname, env) {
  const feeds = {
    "/feeds/gmail": env.GMAIL_ICAL_URL,
    "/feeds/hellomed": env.HELLOMED_ICAL_URL,
    "/feeds/kids": env.KIDS_SHEET_URL,
  };
  return feeds[pathname] || null;
}

async function proxyFeed(target, origin) {
  try {
    const upstream = await fetch(target, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; KalenderProxy/2.0)" },
      cf: { cacheEverything: false, cacheTtl: 0 },
    });

    const headers = responseHeaders(
      origin,
      upstream.headers.get("Content-Type") || "text/plain; charset=utf-8",
    );
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    console.error(JSON.stringify({
      message: "feed proxy failed",
      error: error instanceof Error ? error.message : String(error),
    }));
    return jsonResponse({ error: "Feed unavailable" }, 502, origin);
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(cell); cell = ""; }
    else if (char === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function germanSheetDate(value) {
  const match = String(value || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const parsed = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso ? iso : null;
}

async function handleKidsFeed(target, origin) {
  try {
    const upstream = await fetch(target, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; KalenderProxy/2.0)" },
      cf: { cacheEverything: false, cacheTtl: 0 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!upstream.ok) return jsonResponse({ error: "Kids schedule unavailable" }, 502, origin);
    const rows = parseCsv(await upstream.text()).slice(1);
    const today = berlinDateParts(new Date()).key;
    const fromDate = new Date(`${today}T00:00:00Z`);
    fromDate.setUTCDate(fromDate.getUTCDate() - 31);
    const untilDate = new Date(`${today}T00:00:00Z`);
    untilDate.setUTCDate(untilDate.getUTCDate() + 400);
    const from = fromDate.toISOString().slice(0, 10);
    const until = untilDate.toISOString().slice(0, 10);
    const seen = new Set();
    const days = [];
    for (const row of rows) {
      const date = germanSheetDate(row[0]);
      if (!date || date < from || date > until || seen.has(date)) continue;
      const rawCaretaker = String(row[2] || "").trim();
      const caretaker = rawCaretaker === "Paul" ? "Paul" : rawCaretaker === "Dani" ? "Dani" : "unknown";
      seen.add(date);
      days.push({ date, caretaker });
    }
    days.sort((a, b) => a.date.localeCompare(b.date));
    if (!days.length) return jsonResponse({ error: "Kids schedule unavailable" }, 502, origin);
    return jsonResponse({ schemaVersion: 1, days, generatedAt: new Date().toISOString() }, 200, origin);
  } catch (error) {
    console.error(JSON.stringify({ message: "kids feed failed", error: error instanceof Error ? error.message : String(error) }));
    return jsonResponse({ error: "Kids schedule unavailable" }, 502, origin);
  }
}

function unfoldIcs(text) {
  return String(text || "").replace(/\r?\n[ \t]/g, "");
}

function icsValue(block, property) {
  const match = block.match(new RegExp(`(?:^|\\r?\\n)${property}(?:;[^:]*)?:([^\\r\\n]*)`, "i"));
  return match?.[1]?.trim() || "";
}

function icsDate(value) {
  const match = String(value || "").match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;
  const iso = `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso ? iso : null;
}

function previousIsoDay(value) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function parseAlmaVisits(text, from, until) {
  const visits = [];
  for (const block of unfoldIcs(text).split("BEGIN:VEVENT").slice(1)) {
    const summary = icsValue(block, "SUMMARY").replace(/\\[nN]/g, " ").replace(/\\,/g, ",");
    const normalized = summary.toLocaleLowerCase("de-DE");
    if ((!normalized.includes("schwerin") && !normalized.includes("alma")) || /geburt|birthday|bday/.test(normalized)) continue;
    const rawStart = icsValue(block, "DTSTART");
    const rawEnd = icsValue(block, "DTEND");
    const startDate = icsDate(rawStart);
    if (!startDate) continue;
    let endDate = icsDate(rawEnd) || startDate;
    if (/^\d{8}$/.test(rawEnd)) endDate = previousIsoDay(endDate);
    if (endDate < startDate) endDate = startDate;
    if (endDate < from || startDate > until) continue;
    visits.push({ startDate, endDate });
  }
  return visits;
}

async function fetchCalendarText(target) {
  const maximumBytes = 8_000_000;
  const upstream = await fetch(target, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; KalenderProxy/2.0)" },
    cf: { cacheEverything: false, cacheTtl: 0 },
    signal: AbortSignal.timeout(15_000),
  });
  if (!upstream.ok) throw new Error(`calendar upstream ${upstream.status}`);
  const declaredLength = Number(upstream.headers.get("Content-Length") || 0);
  if (declaredLength > maximumBytes) throw new Error(`calendar upstream too large (${declaredLength} bytes)`);
  const text = await upstream.text();
  if (text.length > maximumBytes) throw new Error(`calendar upstream too large (${text.length} chars)`);
  if (!text.includes("BEGIN:VCALENDAR")) throw new Error("invalid calendar upstream");
  return text;
}

async function handleAlmaFeed(env, origin) {
  try {
    const today = berlinDateParts(new Date()).key;
    const fromDate = new Date(`${today}T00:00:00Z`);
    fromDate.setUTCDate(fromDate.getUTCDate() - 31);
    const untilDate = new Date(`${today}T00:00:00Z`);
    untilDate.setUTCDate(untilDate.getUTCDate() + 730);
    const from = fromDate.toISOString().slice(0, 10);
    const until = untilDate.toISOString().slice(0, 10);
    const results = await Promise.allSettled([
      fetchCalendarText(env.GMAIL_ICAL_URL),
      fetchCalendarText(env.HELLOMED_ICAL_URL),
    ]);
    for (const [index, result] of results.entries()) {
      if (result.status === "rejected") console.error(JSON.stringify({
        message: "alma calendar source failed",
        source: index === 0 ? "gmail" : "hellomed",
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      }));
    }
    const calendars = results.filter((result) => result.status === "fulfilled").map((result) => result.value);
    if (!calendars.length) return jsonResponse({ error: "Alma visits unavailable" }, 502, origin);
    const unique = new Map();
    for (const calendar of calendars) {
      for (const visit of parseAlmaVisits(calendar, from, until)) unique.set(`${visit.startDate}|${visit.endDate}`, visit);
    }
    const visits = [...unique.values()].sort((a, b) => a.startDate.localeCompare(b.startDate));
    return jsonResponse({ schemaVersion: 1, visits, generatedAt: new Date().toISOString() }, 200, origin);
  } catch (error) {
    console.error(JSON.stringify({ message: "alma feed failed", error: error instanceof Error ? error.message : String(error) }));
    return jsonResponse({ error: "Alma visits unavailable" }, 502, origin);
  }
}

const CALENDAR_CATEGORIES = Object.freeze({
  maja: "Mit Maja",
  birthday: "Geburtstage",
  family: "Familie",
  sport: "Sport",
  culture: "Kultur",
  health: "Gesundheit",
  travel: "Reisen",
  other: "Sonstiges",
});

function calendarCategory(summary, source) {
  const value = summary.toLocaleLowerCase("de-DE");
  if (value.includes("maja")) return "maja";
  if (/geburt|birthday|bday|🎂|🎁/.test(value)) return "birthday";
  if (/kids|rosa|emil|alma|schwerin|familie/.test(value)) return "family";
  if (/union|fußball|fussball|bundesliga|dfb|champions league|europa league|sport/.test(value)) return "sport";
  if (/konzert|theater|kino|oper|museum|festival|🎵|🎶|🎤|🎭/.test(value)) return "culture";
  if (source === "hellomed" || /arzt|zahnarzt|therapie|impfung|praxis|klinik|gesund/.test(value)) return "health";
  if (/reise|flug|airport|hotel|bahn|zug|urlaub/.test(value)) return "travel";
  return "other";
}

function safeCalendarTitle(value) {
  return String(value || "").replace(/\\[nN]/g, " ").replace(/\\,/g, ",").replace(/[\u0000-\u001F\u007F<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
}

function calendarMoment(rawValue) {
  const value = String(rawValue || "");
  const match = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?Z?)?/);
  if (!match) return null;
  const date = `${match[1]}-${match[2]}-${match[3]}`;
  if (!match[4]) return { date, time: null, allDay: true };
  if (value.endsWith("Z")) {
    const instant = new Date(`${date}T${match[4]}:${match[5]}:${match[6] || "00"}Z`);
    if (Number.isNaN(instant.getTime())) return null;
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(instant).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
    return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}`, allDay: false };
  }
  return { date, time: `${match[4]}:${match[5]}`, allDay: false };
}

function parseCalendarPreview(text, source, from, until) {
  const events = [];
  for (const block of unfoldIcs(text).split("BEGIN:VEVENT").slice(1)) {
    const title = safeCalendarTitle(icsValue(block, "SUMMARY"));
    const moment = calendarMoment(icsValue(block, "DTSTART"));
    if (!title || !moment || moment.date < from || moment.date > until) continue;
    events.push({ date: moment.date, time: moment.time, allDay: moment.allDay, title, category: calendarCategory(title, source) });
  }
  return events;
}

async function handleCalendarPreview(env, origin) {
  try {
    const today = berlinDateParts(new Date()).key;
    const untilDate = new Date(`${today}T00:00:00Z`);
    untilDate.setUTCDate(untilDate.getUTCDate() + 180);
    const until = untilDate.toISOString().slice(0, 10);
    const sources = [
      ["gmail", env.GMAIL_ICAL_URL],
      ["hellomed", env.HELLOMED_ICAL_URL],
    ];
    const results = await Promise.allSettled(sources.map(([, target]) => fetchCalendarText(target)));
    const unique = new Map();
    for (const [index, result] of results.entries()) {
      if (result.status === "rejected") {
        console.error(JSON.stringify({ message: "calendar preview source failed", source: sources[index][0], error: result.reason instanceof Error ? result.reason.message : String(result.reason) }));
        continue;
      }
      for (const event of parseCalendarPreview(result.value, sources[index][0], today, until)) {
        unique.set(`${event.date}|${event.time || ""}|${event.title}`, event);
      }
    }
    if (results.every((result) => result.status === "rejected")) return jsonResponse({ error: "Calendar preview unavailable" }, 502, origin);
    const events = [...unique.values()].sort((a, b) => `${a.date}T${a.time || "00:00"}`.localeCompare(`${b.date}T${b.time || "00:00"}`)).slice(0, 60);
    const counts = Object.fromEntries(Object.keys(CALENDAR_CATEGORIES).map((key) => [key, events.filter((event) => event.category === key).length]));
    const categories = Object.entries(CALENDAR_CATEGORIES).map(([id, label]) => ({ id, label, count: counts[id] }));
    return jsonResponse({ schemaVersion: 1, events, categories, generatedAt: new Date().toISOString() }, 200, origin);
  } catch (error) {
    console.error(JSON.stringify({ message: "calendar preview failed", error: error instanceof Error ? error.message : String(error) }));
    return jsonResponse({ error: "Calendar preview unavailable" }, 502, origin);
  }
}

async function handleSnapshot(request, env, origin) {
  if (request.method === "GET") {
    const data = await env.KALENDER_KV.get("snapshot");
    if (!data) return jsonResponse(null, 200, origin);
    return new Response(data, { status: 200, headers: responseHeaders(origin) });
  }

  if (request.method !== "PUT") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  }

  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (declaredLength > 200_000) {
    return jsonResponse({ error: "Payload too large" }, 413, origin);
  }

  const body = await request.text();
  if (body.length > 200_000) {
    return jsonResponse({ error: "Payload too large" }, 413, origin);
  }

  try {
    JSON.parse(body);
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400, origin);
  }

  await env.KALENDER_KV.put("snapshot", body, {
    expirationTtl: 60 * 60 * 24 * 90,
  });
  return jsonResponse({ ok: true }, 200, origin);
}

async function handleHoroscope(env, origin) {
  const now = new Date();
  const { key: today, label: date } = berlinDateParts(now);
  const kvKey = `horoscope_${today}`;
  const latestKey = "horoscope_latest";
  const failureKey = `horoscope_failure_${today}`;
  const cachedRaw = await env.KALENDER_KV.get(kvKey);

  if (cachedRaw) {
    try {
      const cached = JSON.parse(cachedRaw);
      const text = normalizeHoroscopeText(cached?.text);
      if (text && cached?.date === today) {
        const value = {
          text,
          date: today,
          generatedAt: cached.generatedAt || null,
        };
        await env.KALENDER_KV.put(latestKey, JSON.stringify(value), { expirationTtl: 60 * 60 * 24 * 14 });
        return horoscopeResponse({
          ...value,
          state: "cached",
        }, origin);
      }
    } catch {
      console.error(JSON.stringify({ message: "invalid horoscope cache", date: today }));
    }
  }

  const staleRaw = await env.KALENDER_KV.get(latestKey);
  let stale = null;
  try {
    const parsed = staleRaw ? JSON.parse(staleRaw) : null;
    const text = normalizeHoroscopeText(parsed?.text);
    if (text && parsed?.date) stale = { ...parsed, text, generatedAt: parsed.generatedAt || null };
  } catch {
    stale = null;
  }

  if (await env.KALENDER_KV.get(failureKey)) {
    if (stale) return horoscopeResponse({ ...stale, state: "stale" }, origin);
    return jsonResponse({ error: "Horoscope temporarily unavailable" }, 503, origin);
  }

  let apiResponse;
  try {
    apiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_SECRET,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 200,
        system: "Du bist ein einfühlsamer Astrologe. Antworte nur mit dem Horoskop-Text auf Deutsch, ohne JSON, Anführungszeichen oder Präambel. Maximal zwei kurze Sätze. Persönlich, alltagsnah, leicht positiv, aber ehrlich.",
        messages: [{
          role: "user",
          content: `Schreibe das heutige Tageshoroskop für eine Person mit Sternzeichen Zwillinge. Heute ist ${date}. Beziehe dich konkret auf den Wochentag und die aktuelle Jahreszeit. Maximal zwei Sätze.`,
        }],
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error(JSON.stringify({ message: "horoscope provider request failed", error: String(error) }));
  }

  if (!apiResponse?.ok) {
    console.error(JSON.stringify({
      message: "horoscope provider failed",
      status: apiResponse?.status || 0,
    }));
    await env.KALENDER_KV.put(failureKey, "1", { expirationTtl: 300 });
    if (stale) return horoscopeResponse({ ...stale, state: "stale" }, origin);
    return jsonResponse({ error: "Horoscope unavailable" }, 502, origin);
  }

  let apiData;
  try {
    apiData = await apiResponse.json();
  } catch {
    await env.KALENDER_KV.put(failureKey, "1", { expirationTtl: 300 });
    if (stale) return horoscopeResponse({ ...stale, state: "stale" }, origin);
    return jsonResponse({ error: "Horoscope unavailable" }, 502, origin);
  }
  const text = normalizeHoroscopeText(apiData?.content?.[0]?.text);
  if (!text) {
    await env.KALENDER_KV.put(failureKey, "1", { expirationTtl: 300 });
    if (stale) return horoscopeResponse({ ...stale, state: "stale" }, origin);
    return jsonResponse({ error: "Horoscope unavailable" }, 502, origin);
  }

  const value = { text, date: today, generatedAt: now.toISOString() };
  const result = JSON.stringify(value);
  await env.KALENDER_KV.put(kvKey, result, { expirationTtl: 60 * 60 * 28 });
  await env.KALENDER_KV.put(latestKey, result, { expirationTtl: 60 * 60 * 24 * 14 });
  return horoscopeResponse({ ...value, state: "live" }, origin);
}

async function handleMarketData(url, env, origin) {
  const symbol = (url.searchParams.get("symbol") || "").toUpperCase();
  const resource = url.pathname === "/market/quote" ? "quote" : "stock/metric";
  const cacheKey = `market:${resource}:${symbol}`;
  const freshFor = resource === "quote" ? 300 : 86_400;

  if (!FINNHUB_SYMBOLS.has(symbol)) {
    return jsonResponse({ error: "Symbol not allowed" }, 400, origin);
  }

  const cachedRaw = await env.KALENDER_KV.get(cacheKey);
  let cached = null;
  try {
    cached = cachedRaw ? JSON.parse(cachedRaw) : null;
  } catch {
    cached = null;
  }
  if (cached?.storedAt && Date.now() - cached.storedAt < freshFor * 1000) {
    return marketResponse(cached.data, origin, "cached", cached.storedAt);
  }

  const upstreamUrl = new URL(`https://finnhub.io/api/v1/${resource}`);
  upstreamUrl.searchParams.set("symbol", symbol);
  if (resource === "stock/metric") upstreamUrl.searchParams.set("metric", "all");
  upstreamUrl.searchParams.set("token", env.FINNHUB_API_SECRET);

  const upstream = await fetch(upstreamUrl);

  if (!upstream.ok) {
    console.error(JSON.stringify({
      message: "market provider failed",
      resource,
      status: upstream.status,
    }));
    if (cached?.data) return marketResponse(cached.data, origin, "stale", cached.storedAt);
    return jsonResponse({ error: "Market data unavailable" }, 502, origin);
  }

  const data = await upstream.json();
  const storedAt = Date.now();
  await env.KALENDER_KV.put(cacheKey, JSON.stringify({ storedAt, data }), {
    expirationTtl: resource === "quote" ? 86_400 : 604_800,
  });
  return marketResponse(data, origin, "live", storedAt);
}

async function handleYahooMarketData(url, env, origin) {
  const symbol = (url.searchParams.get("symbol") || "").toUpperCase();
  if (!YAHOO_SYMBOLS.has(symbol)) {
    return jsonResponse({ error: "Symbol not allowed" }, 400, origin);
  }

  const cacheKey = `market:yahoo:${symbol}`;
  const cachedRaw = await env.KALENDER_KV.get(cacheKey);
  let cached = null;
  try {
    cached = cachedRaw ? JSON.parse(cachedRaw) : null;
  } catch {
    cached = null;
  }
  if (cached?.storedAt && Date.now() - cached.storedAt < 300_000) {
    return marketResponse(cached.data, origin, "cached", cached.storedAt);
  }

  const upstreamUrl = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  upstreamUrl.searchParams.set("interval", "1d");
  upstreamUrl.searchParams.set("range", "5d");

  let upstream;
  try {
    upstream = await fetch(upstreamUrl, { signal: AbortSignal.timeout(8_000) });
  } catch (error) {
    console.error(JSON.stringify({ message: "yahoo provider failed", symbol, error: String(error) }));
    if (cached?.data) return marketResponse(cached.data, origin, "stale", cached.storedAt);
    return jsonResponse({ error: "Market data unavailable" }, 502, origin);
  }

  if (!upstream.ok) {
    console.error(JSON.stringify({ message: "yahoo provider failed", symbol, status: upstream.status }));
    if (cached?.data) return marketResponse(cached.data, origin, "stale", cached.storedAt);
    return jsonResponse({ error: "Market data unavailable" }, 502, origin);
  }

  const providerData = await upstream.json();
  const meta = providerData?.chart?.result?.[0]?.meta;
  const price = Number(meta?.regularMarketPrice);
  if (!Number.isFinite(price) || price <= 0) {
    if (cached?.data) return marketResponse(cached.data, origin, "stale", cached.storedAt);
    return jsonResponse({ error: "Market data unavailable" }, 502, origin);
  }

  const previousClose = Number(meta.chartPreviousClose ?? meta.previousClose ?? price);
  const data = {
    price,
    previousClose,
    changePercent: previousClose ? ((price - previousClose) / previousClose) * 100 : 0,
    high52: Number(meta.fiftyTwoWeekHigh) || null,
    low52: Number(meta.fiftyTwoWeekLow) || null,
    currency: String(meta.currency || "EUR").toUpperCase(),
    marketTime: Number(meta.regularMarketTime) || null,
  };
  const storedAt = Date.now();
  await env.KALENDER_KV.put(cacheKey, JSON.stringify({ storedAt, data }), { expirationTtl: 86_400 });
  return marketResponse(data, origin, "live", storedAt);
}

async function handleReverseLocation(url, env, origin) {
  const rawLat = Number(url.searchParams.get("lat"));
  const rawLon = Number(url.searchParams.get("lon"));
  if (!Number.isFinite(rawLat) || !Number.isFinite(rawLon) || rawLat < -90 || rawLat > 90 || rawLon < -180 || rawLon > 180) {
    return jsonResponse({ error: "Invalid coordinates" }, 400, origin);
  }

  const lat = Math.round(rawLat * 100) / 100;
  const lon = Math.round(rawLon * 100) / 100;
  const cacheKey = `location:reverse:${lat}:${lon}`;
  const cached = await env.KALENDER_KV.get(cacheKey);
  if (cached) return new Response(cached, { status: 200, headers: responseHeaders(origin) });

  const upstreamUrl = new URL("https://nominatim.openstreetmap.org/reverse");
  upstreamUrl.searchParams.set("lat", String(lat));
  upstreamUrl.searchParams.set("lon", String(lon));
  upstreamUrl.searchParams.set("format", "jsonv2");
  upstreamUrl.searchParams.set("addressdetails", "1");
  upstreamUrl.searchParams.set("zoom", "10");
  upstreamUrl.searchParams.set("accept-language", "de");

  const upstream = await fetch(upstreamUrl, {
    headers: {
      Referer: PRODUCTION_ORIGIN,
      "User-Agent": "Paul-Hub/6 (https://zkoberlin.github.io)",
    },
    signal: AbortSignal.timeout(8_000),
  });
  if (!upstream.ok) return jsonResponse({ error: "Location unavailable" }, 502, origin);

  const data = await upstream.json();
  const address = data?.address || {};
  const name = address.city || address.town || address.village || address.municipality || address.county || address.state;
  if (!name) return jsonResponse({ error: "Location unavailable" }, 502, origin);

  const result = JSON.stringify({ name: String(name).slice(0, 100), lat, lon });
  await env.KALENDER_KV.put(cacheKey, result, { expirationTtl: 30 * 24 * 60 * 60 });
  return new Response(result, { status: 200, headers: responseHeaders(origin) });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") return preflightResponse(origin);
    if (!isAllowedOrigin(origin)) {
      return jsonResponse({ error: "Origin not allowed" }, 403, origin);
    }

    try {
      if (PRIVATE_PATHS.has(url.pathname)) {
        const user = await verifyGoogleUser(request, env);
        if (!user) return jsonResponse({ error: "Unauthorized" }, 401, origin);
      }

      if (url.pathname === "/snapshot") {
        return await handleSnapshot(request, env, origin);
      }

      if (url.pathname === "/horoscope" && request.method === "GET") {
        return await handleHoroscope(env, origin);
      }

      if (url.pathname === "/auth/me" && request.method === "GET") {
        return await handleAuthMe(request, env, origin);
      }

      if (request.method === "GET" && url.pathname === "/market/yahoo") {
        return await handleYahooMarketData(url, env, origin);
      }
      if (request.method === "GET" && url.pathname === "/location/reverse") {
        return await handleReverseLocation(url, env, origin);
      }
      if (request.method === "GET" && (url.pathname === "/market/quote" || url.pathname === "/market/metric")) {
        return await handleMarketData(url, env, origin);
      }

      if (request.method === "GET") {
        if (url.pathname === "/feeds/kids") return await handleKidsFeed(env.KIDS_SHEET_URL, origin);
        if (url.pathname === "/feeds/alma") return await handleAlmaFeed(env, origin);
        if (url.pathname === "/feeds/calendar-preview") return await handleCalendarPreview(env, origin);
        const namedFeed = getFeedUrl(url.pathname, env);
        if (namedFeed) return await proxyFeed(namedFeed, origin);
      }

      return jsonResponse({ error: "Not found" }, 404, origin);
    } catch (error) {
      console.error(JSON.stringify({
        message: "request failed",
        path: url.pathname,
        error: error instanceof Error ? error.message : String(error),
      }));
      return jsonResponse({ error: "Internal server error" }, 500, origin);
    }
  },
};
