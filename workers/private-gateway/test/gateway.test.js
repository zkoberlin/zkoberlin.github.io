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
  };
}

test("blocks every private route without a token", async () => {
  for (const path of ["/feeds/gmail", "/feeds/hellomed", "/feeds/kids", "/snapshot"]) {
    const response = await worker.fetch(new Request(`https://gateway.test${path}`), env());
    assert.equal(response.status, 401, path);
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
