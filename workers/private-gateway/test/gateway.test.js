import assert from "node:assert/strict";
import test from "node:test";

import worker from "../src/index.js";

function env() {
  const alcoholEntries = [];
  const preferences = new Map();
  const finance = new Map();
  const sessions = new Map();
  return {
    ALLOWED_GOOGLE_EMAIL: "paul@example.test",
    BACKEND: {
      async fetch(request) {
        return new Response(JSON.stringify({ path: new URL(request.url).pathname }));
      },
    },
    HUB_PREVIEW_SECRET: "integration-secret",
    HUB_DB: {
      withSession(constraint) {
        assert.equal(constraint, "first-primary");
        return this;
      },
      prepare(sql) {
        let values = [];
        return {
          bind(...args) { values = args; return this; },
          async all() { return { results: alcoholEntries.slice() }; },
          async first() {
            if (sql.includes("FROM finance_state")) return finance.has(values[0]) ? finance.get(values[0]) : null;
            if (sql.includes("FROM hub_sessions")) {
              const session = sessions.get(values[0]);
              return session && session.expiresAt > values[1] ? session : null;
            }
            return preferences.has(values[0]) ? { value: preferences.get(values[0]) } : null;
          },
          async run() {
            if (sql.startsWith("INSERT INTO hub_sessions")) {
              sessions.set(values[0], { email: values[1], name: values[2], expiresAt: values[3] });
            } else if (sql.startsWith("DELETE FROM hub_sessions WHERE session_hash")) {
              sessions.delete(values[0]);
            } else if (sql.startsWith("DELETE FROM hub_sessions")) {
              for (const [hash, session] of sessions) if (session.expiresAt <= values[0]) sessions.delete(hash);
            } else if (sql.startsWith("INSERT INTO hub_preferences")) {
              preferences.set(values[0], values[1]);
            } else if (sql.startsWith("INSERT INTO finance_state")) {
              finance.set(values[0], { payload: values[1], updatedAt: "2026-08-28 12:00:00" });
            } else if (sql.startsWith("INSERT")) {
              alcoholEntries.push({ entryId: values[0], date: values[1], time: values[2], drinkCode: values[3], label: values[4], units: values[5] });
            } else if (sql.startsWith("DELETE")) {
              const index = alcoholEntries.findIndex((entry) => entry.entryId === values[0]);
              if (index >= 0) alcoholEntries.splice(index, 1);
            }
            return { success: true };
          },
        };
      },
    },
    TRAILYX: {
      async fetch(request) {
        assert.equal(new URL(request.url).pathname, "/internal/hub-preview");
        assert.equal(request.headers.get("X-Hub-Preview-Key"), "integration-secret");
        assert.equal(request.headers.has("Authorization"), false);
        return Response.json({
          schemaVersion: 2,
          year: 2026,
          nextTrip: { destinationCity: "Wien", destinationCountry: "Österreich", startDate: "2026-09-10", endDate: "2026-09-14", distanceKm: 692, transportModes: ["Zug", "ÖPNV"] },
          lastTrip: null,
          stats: { distanceKm: 880, trips: 1, countries: 1, cities: 1 },
          generatedAt: "2026-08-27T12:00:00Z",
        });
      },
    },
  };
}

test("blocks every private route without a token", async () => {
  for (const path of ["/feeds/gmail", "/feeds/hellomed", "/feeds/kids", "/feeds/alma", "/feeds/calendar-preview", "/calendar-preferences", "/snapshot", "/trailyx-preview", "/alcohol", "/finance", "/finance-preview", "/portfolio-preview"]) {
    const response = await worker.fetch(new Request(`https://gateway.test${path}`), env());
    assert.equal(response.status, 401, path);
  }
});

test("creates a 30-day session, accepts it, and revokes it on logout", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ email: "paul@example.test", email_verified: true, name: "Paul" }));
  const testEnv = env();
  try {
    const created = await worker.fetch(new Request("https://gateway.test/auth/session", {
      method: "POST",
      headers: { Authorization: "Bearer google-token" },
    }), testEnv);
    assert.equal(created.status, 201);
    const session = await created.json();
    assert.match(session.sessionToken, /^ps1_[a-f0-9]{64}$/);
    assert.ok(session.expiresAt > Date.now() + 29 * 24 * 60 * 60 * 1000);

    const authenticated = await worker.fetch(new Request("https://gateway.test/auth/me", {
      headers: { Authorization: `Bearer ${session.sessionToken}` },
    }), testEnv);
    assert.equal(authenticated.status, 200);
    assert.equal((await authenticated.json()).user.email, "paul@example.test");

    const logout = await worker.fetch(new Request("https://gateway.test/auth/session", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.sessionToken}` },
    }), testEnv);
    assert.equal(logout.status, 204);

    const revoked = await worker.fetch(new Request("https://gateway.test/auth/me", {
      headers: { Authorization: `Bearer ${session.sessionToken}` },
    }), testEnv);
    assert.equal(revoked.status, 401);

    const unknown = await worker.fetch(new Request("https://gateway.test/auth/me", {
      headers: { Authorization: `Bearer ps1_${"0".repeat(64)}` },
    }), testEnv);
    assert.equal(unknown.status, 401);
  } finally { globalThis.fetch = originalFetch; }
});

test("stores finance state and exposes only a minimal preview", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ email: "paul@example.test", email_verified: true, name: "Paul" }));
  const testEnv = env();
  const payload = {
    v: 3,
    ts: "2026-08-28T12:00:00.000Z",
    s: { gehalt: { v: 4000 }, miete: { v: 1500, on: true }, invest: { v: 300 }, notgr: { v: 100 }, urlaub: { v: 50 }, sonder: { v: 0 } },
    c: [{ k: "fitness", name: "Fitnessstudio", amt: 30, monthly: 30, freq: "monthly", cat: "Freizeit", icon: "🏋️" }],
  };
  try {
    const missing = await worker.fetch(new Request("https://gateway.test/finance", { headers: { Authorization: "Bearer valid-token" } }), testEnv);
    assert.equal(missing.status, 404);

    const saved = await worker.fetch(new Request("https://gateway.test/finance", {
      method: "PUT",
      headers: { Authorization: "Bearer valid-token", "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }), testEnv);
    assert.equal(saved.status, 200);

    const full = await worker.fetch(new Request("https://gateway.test/finance", { headers: { Authorization: "Bearer valid-token" } }), testEnv);
    assert.deepEqual(await full.json(), payload);

    const previewResponse = await worker.fetch(new Request("https://gateway.test/finance-preview", { headers: { Authorization: "Bearer valid-token" } }), testEnv);
    const preview = await previewResponse.json();
    assert.equal(previewResponse.status, 200);
    assert.equal(preview.buffer, 2020);
    assert.equal(preview.savingsMonthly, 400);
    assert.equal(preview.savingsRate, 10);
    assert.equal("s" in preview, false);
    assert.equal(JSON.stringify(preview).includes("Fitnessstudio"), false);

    const invalid = await worker.fetch(new Request("https://gateway.test/finance", {
      method: "PUT",
      headers: { Authorization: "Bearer valid-token", "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, s: { gehalt: { v: -1 } } }),
    }), testEnv);
    assert.equal(invalid.status, 400);

    const invalidIcon = await worker.fetch(new Request("https://gateway.test/finance", {
      method: "PUT",
      headers: { Authorization: "Bearer valid-token", "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, c: [{ ...payload.c[0], icon: "<script>" }] }),
    }), testEnv);
    assert.equal(invalidIcon.status, 400);
  } finally { globalThis.fetch = originalFetch; }
});

test("stores and deletes alcohol entries only through the verified route", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    email: "paul@example.test",
    email_verified: true,
    name: "Paul",
  }));
  const testEnv = env();
  try {
    const created = await worker.fetch(new Request("https://gateway.test/alcohol", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token", "Content-Type": "application/json" },
      body: JSON.stringify({ drinkCode: "bier03", units: 999, occurredOn: "2026-08-20" }),
    }), testEnv);
    assert.equal(created.status, 201);
    const createdData = await created.json();
    assert.equal(createdData.entry.units, 1.3);
    assert.equal(createdData.entry.date, "2026-08-20");

    const future = await worker.fetch(new Request("https://gateway.test/alcohol", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token", "Content-Type": "application/json" },
      body: JSON.stringify({ drinkCode: "bier03", occurredOn: "2999-01-01" }),
    }), testEnv);
    assert.equal(future.status, 400);

    const listed = await worker.fetch(new Request("https://gateway.test/alcohol", {
      headers: { Authorization: "Bearer valid-token" },
    }), testEnv);
    assert.equal(listed.status, 200);
    assert.equal((await listed.json()).entries.length, 1);

    const deleted = await worker.fetch(new Request("https://gateway.test/alcohol", {
      method: "DELETE",
      headers: { Authorization: "Bearer valid-token", "Content-Type": "application/json" },
      body: JSON.stringify({ entryId: createdData.entry.entryId }),
    }), testEnv);
    assert.equal(deleted.status, 204);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("stores validated calendar category preferences", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ email: "paul@example.test", email_verified: true, name: "Paul" }));
  const testEnv = env();
  try {
    const defaults = await worker.fetch(new Request("https://gateway.test/calendar-preferences", { headers: { Authorization: "Bearer valid-token" } }), testEnv);
    assert.equal(defaults.status, 200);
    assert.ok((await defaults.json()).selected.includes("maja"));

    const saved = await worker.fetch(new Request("https://gateway.test/calendar-preferences", {
      method: "PUT",
      headers: { Authorization: "Bearer valid-token", "Content-Type": "application/json" },
      body: JSON.stringify({ selected: ["maja", "travel"] }),
    }), testEnv);
    assert.deepEqual((await saved.json()).selected, ["maja", "travel"]);

    const listed = await worker.fetch(new Request("https://gateway.test/calendar-preferences", { headers: { Authorization: "Bearer valid-token" } }), testEnv);
    assert.deepEqual((await listed.json()).selected, ["maja", "travel"]);

    const invalid = await worker.fetch(new Request("https://gateway.test/calendar-preferences", {
      method: "PUT",
      headers: { Authorization: "Bearer valid-token", "Content-Type": "application/json" },
      body: JSON.stringify({ selected: ["private-notes"] }),
    }), testEnv);
    assert.equal(invalid.status, 400);
  } finally { globalThis.fetch = originalFetch; }
});

test("returns the minimal TrailYX preview for the verified account", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    email: "paul@example.test",
    email_verified: true,
    name: "Paul",
  }));
  try {
    const response = await worker.fetch(new Request("https://gateway.test/trailyx-preview", {
      headers: { Authorization: "Bearer valid-token" },
    }), env());
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.deepEqual(data.stats, { distanceKm: 880, trips: 1, countries: 1, cities: 1 });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("forwards public routes without authentication", async () => {
  for (const path of ["/horoscope", "/location/reverse"]) {
    const response = await worker.fetch(new Request(`https://gateway.test${path}`), env());
    assert.equal(response.status, 200, path);
    assert.deepEqual(await response.json(), { path }, path);
  }
});

test("does not expose individual market routes through the gateway", async () => {
  for (const path of ["/market/quote?symbol=MSFT", "/market/metric?symbol=MSFT", "/market/yahoo?symbol=MSFT"]) {
    const response = await worker.fetch(new Request(`https://gateway.test${path}`), env());
    assert.equal(response.status, 404, path);
  }
});

test("forwards a private route for the verified account", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    email: "paul@example.test",
    email_verified: true,
    name: "Paul",
  }));
  try {
    const response = await worker.fetch(new Request("https://gateway.test/feeds/gmail", {
      headers: { Authorization: "Bearer valid-token" },
    }), env());
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { path: "/feeds/gmail" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects an unknown route and a foreign origin", async () => {
  const unknown = await worker.fetch(new Request("https://gateway.test/unknown"), env());
  assert.equal(unknown.status, 404);
  const foreign = await worker.fetch(new Request("https://gateway.test/horoscope", {
    headers: { Origin: "https://example.org" },
  }), env());
  assert.equal(foreign.status, 403);
});
