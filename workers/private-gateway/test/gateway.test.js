import assert from "node:assert/strict";
import test from "node:test";

import worker from "../src/index.js";

function env() {
  return {
    ALLOWED_GOOGLE_EMAIL: "paul@example.test",
    BACKEND: {
      async fetch(request) {
        return new Response(JSON.stringify({ path: new URL(request.url).pathname }));
      },
    },
    HUB_PREVIEW_SECRET: "integration-secret",
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
  for (const path of ["/feeds/gmail", "/feeds/hellomed", "/feeds/kids", "/snapshot", "/trailyx-preview"]) {
    const response = await worker.fetch(new Request(`https://gateway.test${path}`), env());
    assert.equal(response.status, 401, path);
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
