import assert from "node:assert/strict";
import test from "node:test";

import worker from "../src/index.js";

function createEnv() {
  const store = new Map();
  return {
    ALLOWED_GOOGLE_EMAIL: "paul@example.test",
    ANTHROPIC_API_SECRET: "test-api-key",
    FINNHUB_API_SECRET: "test-finnhub-key",
    GMAIL_ICAL_URL: "https://calendar.example.test/gmail.ics",
    HELLOMED_ICAL_URL: "https://calendar.example.test/hellomed.ics",
    KIDS_SHEET_URL: "https://sheets.example.test/kids.csv",
    KALENDER_KV: {
      async get(key) {
        return store.get(key) ?? null;
      },
      async put(key, value) {
        store.set(key, value);
      },
    },
  };
}

function authorizedRequest(url, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", "Bearer valid-token");
  return new Request(url, { ...init, headers });
}

function googleProfileResponse() {
  return new Response(JSON.stringify({
    email: "paul@example.test",
    email_verified: true,
    name: "Paul",
  }));
}

test("rejects an unapproved browser origin", async () => {
  const response = await worker.fetch(
    new Request("https://worker.example.test/snapshot", {
      headers: { Origin: "https://example.org" },
    }),
    createEnv(),
  );

  assert.equal(response.status, 403);
});

test("requires a bearer token for the authentication check", async () => {
  const response = await worker.fetch(
    new Request("https://worker.example.test/auth/me"),
    createEnv(),
  );

  assert.equal(response.status, 401);
});

test("accepts only the configured verified Google account", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers.Authorization, "Bearer valid-token");
    return new Response(JSON.stringify({
      email: "paul@example.test",
      email_verified: true,
      name: "Paul",
    }));
  };

  try {
    const response = await worker.fetch(
      new Request("https://worker.example.test/auth/me", {
        headers: { Authorization: "Bearer valid-token" },
      }),
      createEnv(),
    );

    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.authenticated, true);
    assert.equal(data.user.email, "paul@example.test");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not expose the removed legacy proxy endpoint", async () => {
  const target = encodeURIComponent("https://example.org/private");
  const response = await worker.fetch(
    new Request(`https://worker.example.test/ical?url=${target}`, {
      headers: { Origin: "http://localhost:8000" },
    }),
    createEnv(),
  );

  assert.equal(response.status, 404);
});

test("returns null when no snapshot exists", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => googleProfileResponse();
  try {
    const response = await worker.fetch(
      authorizedRequest("https://worker.example.test/snapshot"),
      createEnv(),
    );
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "null");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects invalid snapshot JSON", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => googleProfileResponse();
  try {
    const response = await worker.fetch(
      authorizedRequest("https://worker.example.test/snapshot", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: "not-json",
      }),
      createEnv(),
    );
    assert.equal(response.status, 400);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("resolves a named feed through its secret binding", async () => {
  const originalFetch = globalThis.fetch;
  const env = createEnv();
  let requestedUrl = "";

  globalThis.fetch = async (url) => {
    if (String(url).includes("openidconnect.googleapis.com")) return googleProfileResponse();
    requestedUrl = String(url);
    return new Response("BEGIN:VCALENDAR\nEND:VCALENDAR", {
      headers: { "Content-Type": "text/calendar" },
    });
  };

  try {
    const response = await worker.fetch(
      authorizedRequest("https://worker.example.test/feeds/gmail", {
        headers: { Origin: "http://localhost:8000" },
      }),
      env,
    );

    assert.equal(response.status, 200);
    assert.equal(requestedUrl, env.GMAIL_ICAL_URL);
    assert.match(await response.text(), /BEGIN:VCALENDAR/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("protects private feeds and snapshots without a Google token", async () => {
  for (const path of ["/feeds/gmail", "/feeds/hellomed", "/feeds/kids", "/snapshot"]) {
    const response = await worker.fetch(
      new Request(`https://worker.example.test${path}`),
      createEnv(),
    );
    assert.equal(response.status, 401, path);
  }
});

test("rejects market symbols outside the portfolio allowlist", async () => {
  const response = await worker.fetch(
    new Request("https://worker.example.test/market/quote?symbol=UNKNOWN", {
      headers: { Origin: "http://localhost:8000" },
    }),
    createEnv(),
  );

  assert.equal(response.status, 400);
});

test("loads an allowed market quote without exposing the provider key", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";

  globalThis.fetch = async (url) => {
    requestedUrl = String(url);
    return new Response(JSON.stringify({ c: 123, pc: 120, dp: 2.5 }));
  };

  try {
    const response = await worker.fetch(
      new Request("https://worker.example.test/market/quote?symbol=MSFT", {
        headers: { Origin: "http://localhost:8000" },
      }),
      createEnv(),
    );

    assert.equal(response.status, 200);
    assert.match(requestedUrl, /symbol=MSFT/);
    assert.match(requestedUrl, /token=test-finnhub-key/);
    assert.doesNotMatch(await response.text(), /test-finnhub-key/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("serves a fresh market quote from KV without calling the provider", async () => {
  const originalFetch = globalThis.fetch;
  const env = createEnv();
  await env.KALENDER_KV.put("market:quote:MSFT", JSON.stringify({
    storedAt: Date.now(),
    data: { c: 125, pc: 120, dp: 4.16 },
  }));
  globalThis.fetch = async () => {
    throw new Error("provider should not be called");
  };

  try {
    const response = await worker.fetch(
      new Request("https://worker.example.test/market/quote?symbol=MSFT"),
      env,
    );
    assert.equal(response.status, 200);
    assert.equal((await response.json()).c, 125);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects Yahoo symbols outside the portfolio allowlist", async () => {
  const response = await worker.fetch(
    new Request("https://worker.example.test/market/yahoo?symbol=UNKNOWN"),
    createEnv(),
  );
  assert.equal(response.status, 400);
});

test("normalizes an allowed Yahoo quote and preserves its currency", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  globalThis.fetch = async (url) => {
    requestedUrl = String(url);
    return new Response(JSON.stringify({
      chart: {
        result: [{
          meta: {
            regularMarketPrice: 200,
            chartPreviousClose: 190,
            fiftyTwoWeekHigh: 220,
            fiftyTwoWeekLow: 150,
            currency: "USD",
            regularMarketTime: 1234567890,
          },
        }],
      },
    }));
  };

  try {
    const response = await worker.fetch(
      new Request("https://worker.example.test/market/yahoo?symbol=MSFT", {
        headers: { Origin: "http://localhost:8000" },
      }),
      createEnv(),
    );
    assert.equal(response.status, 200);
    assert.match(requestedUrl, /query1\.finance\.yahoo\.com/);
    assert.match(requestedUrl, /MSFT/);
    const data = await response.json();
    assert.equal(data.currency, "USD");
    assert.equal(data.price, 200);
    assert.ok(Math.abs(data.changePercent - 5.2631578947) < 0.0001);
    assert.equal(response.headers.get("X-Market-Data"), "live");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
