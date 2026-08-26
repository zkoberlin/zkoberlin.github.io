const PRODUCTION_ORIGIN = "https://zkoberlin.github.io";
const DEVELOPMENT_ORIGINS = new Set([
  "http://localhost:8000",
  "http://127.0.0.1:8000",
]);
const FINNHUB_SYMBOLS = new Set([
  "MSFT", "GOOGL", "ASML", "NVO", "PG", "WTKWY", "MELI", "SIEGY",
  "HVRRF", "RACE", "TSLA", "NU", "CTAS", "AXP", "HESAY", "NFLX",
  "ZTS", "RR", "CLOV",
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
  const today = new Date().toISOString().slice(0, 10);
  const kvKey = `horoscope_${today}`;
  const cached = await env.KALENDER_KV.get(kvKey);

  if (cached) {
    return new Response(cached, { status: 200, headers: responseHeaders(origin) });
  }

  const weekdays = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  const months = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const now = new Date();
  const date = `${weekdays[now.getDay()]}, ${now.getDate()}. ${months[now.getMonth()]} ${now.getFullYear()}`;

  const apiResponse = await fetch("https://api.anthropic.com/v1/messages", {
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
  });

  if (!apiResponse.ok) {
    console.error(JSON.stringify({
      message: "horoscope provider failed",
      status: apiResponse.status,
    }));
    return jsonResponse({ error: "Horoscope unavailable" }, 502, origin);
  }

  const apiData = await apiResponse.json();
  const text = apiData?.content?.[0]?.text || "";
  if (!text) return jsonResponse({ error: "Horoscope unavailable" }, 502, origin);

  const result = JSON.stringify({ text, date: today });
  await env.KALENDER_KV.put(kvKey, result, { expirationTtl: 60 * 60 * 28 });
  return new Response(result, { status: 200, headers: responseHeaders(origin) });
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
    return jsonResponse(cached.data, 200, origin);
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
    if (cached?.data) return jsonResponse(cached.data, 200, origin);
    return jsonResponse({ error: "Market data unavailable" }, 502, origin);
  }

  const data = await upstream.json();
  await env.KALENDER_KV.put(cacheKey, JSON.stringify({ storedAt: Date.now(), data }), {
    expirationTtl: resource === "quote" ? 86_400 : 604_800,
  });
  return jsonResponse(data, 200, origin);
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
      if (url.pathname === "/snapshot") {
        return await handleSnapshot(request, env, origin);
      }

      if (url.pathname === "/horoscope" && request.method === "GET") {
        return await handleHoroscope(env, origin);
      }

      if (url.pathname === "/auth/me" && request.method === "GET") {
        return await handleAuthMe(request, env, origin);
      }

      if (
        request.method === "GET"
        && (url.pathname === "/market/quote" || url.pathname === "/market/metric")
      ) {
        return await handleMarketData(url, env, origin);
      }

      if (request.method === "GET") {
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
