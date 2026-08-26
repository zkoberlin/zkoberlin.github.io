const PRODUCTION_ORIGIN = "https://zkoberlin.github.io";
const DEVELOPMENT_ORIGINS = new Set([
  "http://localhost:8000",
  "http://127.0.0.1:8000",
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
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Access-Control-Max-Age", "86400");
  return new Response(null, { status: 204, headers });
}

function getFeedUrl(pathname, env) {
  const feeds = {
    "/feeds/gmail": env.GMAIL_ICAL_URL,
    "/feeds/hellomed": env.HELLOMED_ICAL_URL,
    "/feeds/kids": env.KIDS_SHEET_URL,
  };
  return feeds[pathname] || null;
}

function isConfiguredFeedUrl(target, env) {
  return [env.GMAIL_ICAL_URL, env.HELLOMED_ICAL_URL, env.KIDS_SHEET_URL].includes(target);
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

      if (request.method === "GET") {
        const namedFeed = getFeedUrl(url.pathname, env);
        if (namedFeed) return await proxyFeed(namedFeed, origin);
      }

      if (url.pathname === "/ical" && request.method === "GET") {
        const target = url.searchParams.get("url") || "";
        if (!target) return jsonResponse({ error: "Missing url parameter" }, 400, origin);
        if (!isConfiguredFeedUrl(target, env)) {
          return jsonResponse({ error: "Feed not allowed" }, 403, origin);
        }
        return await proxyFeed(target, origin);
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
