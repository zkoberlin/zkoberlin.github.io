import assert from "node:assert/strict";
import test from "node:test";

import worker from "../src/index.js";

function createEnv() {
  const store = new Map();
  return {
    ANTHROPIC_API_SECRET: "test-api-key",
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

test("rejects an unapproved browser origin", async () => {
  const response = await worker.fetch(
    new Request("https://worker.example.test/snapshot", {
      headers: { Origin: "https://example.org" },
    }),
    createEnv(),
  );

  assert.equal(response.status, 403);
});

test("rejects arbitrary legacy proxy targets", async () => {
  const target = encodeURIComponent("https://example.org/private");
  const response = await worker.fetch(
    new Request(`https://worker.example.test/ical?url=${target}`, {
      headers: { Origin: "http://localhost:8000" },
    }),
    createEnv(),
  );

  assert.equal(response.status, 403);
});

test("returns null when no snapshot exists", async () => {
  const response = await worker.fetch(
    new Request("https://worker.example.test/snapshot"),
    createEnv(),
  );

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "null");
});

test("rejects invalid snapshot JSON", async () => {
  const response = await worker.fetch(
    new Request("https://worker.example.test/snapshot", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    }),
    createEnv(),
  );

  assert.equal(response.status, 400);
});

test("resolves a named feed through its secret binding", async () => {
  const originalFetch = globalThis.fetch;
  const env = createEnv();
  let requestedUrl = "";

  globalThis.fetch = async (url) => {
    requestedUrl = String(url);
    return new Response("BEGIN:VCALENDAR\nEND:VCALENDAR", {
      headers: { "Content-Type": "text/calendar" },
    });
  };

  try {
    const response = await worker.fetch(
      new Request("https://worker.example.test/feeds/gmail", {
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
