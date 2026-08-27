import assert from "node:assert/strict";
import test from "node:test";

import worker from "../src/index.js";

function env() {
  const alcoholEntries = [];
  return {
    ALLOWED_GOOGLE_EMAIL: "paul@example.test",
    BACKEND: {
      async fetch(request) {
        return new Response(JSON.stringify({ path: new URL(request.url).pathname }));
      },
    },
    HUB_PREVIEW_SECRET: "integration-secret",
    HUB_DB: {
      prepare(sql) {
        let values = [];
        return {
          bind(...args) { values = args; return this; },
          async all() { return { results: alcoholEntries.slice() }; },
          async run() {
            if (sql.startsWith("INSERT")) {
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
  for (const path of ["/feeds/gmail", "/feeds/hellomed", "/feeds/kids", "/snapshot", "/trailyx-preview", "/alcohol"]) {
    const response = await worker.fetch(new Request(`https://gateway.test${path}`), env());
    assert.equal(response.status, 401, path);
  }
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
  for (const path of ["/horoscope", "/market/quote", "/market/metric", "/market/yahoo", "/location/reverse"]) {
    const response = await worker.fetch(new Request(`https://gateway.test${path}`), env());
    assert.equal(response.status, 200, path);
    assert.deepEqual(await response.json(), { path }, path);
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
