import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createGeminiConfiguration } from "./gemini-config.mjs";
// Deliberately fake fixtures. No provider request is made in these tests.
const code = "test-only-setup-code-not-a-real-secret";
const key = "test-only-gemini-key-not-a-real-credential";
async function fixture(t, options = {}) {
  const configuration = createGeminiConfiguration({
    setupToken: code,
    ...options,
  });
  const app = express();
  app.use(express.json());
  app.use("/config", configuration.router);
  app.get("/health", (_req, res) => res.json(configuration.status()));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const put = (
    body = { apiKey: key, model: "gemini-2.5-flash" },
    token = code,
  ) =>
    fetch(`${base}/config`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-pixora-setup-token": token,
      },
      body: JSON.stringify(body),
    });
  return { configuration, base, put };
}
test("configuration requires a valid setup code and never changes state on auth failure", async (t) => {
  const { put, configuration } = await fixture(t);
  const r = await put(undefined, "incorrect");
  assert.equal(r.status, 401);
  assert.equal(configuration.current().apiKey, "");
  assert.equal(configuration.status().configured, false);
});
test("stores key in server memory, exposes only safe status, and makes no provider request", async (t) => {
  const { put, configuration, base } = await fixture(t);
  const r = await put();
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("cache-control"), "no-store");
  const body = await r.text();
  assert.equal(body.includes(key), false);
  assert.equal(body.includes(code), false);
  assert.equal(configuration.current().apiKey, key);
  assert.equal(configuration.status().keySource, "session");
  const health = await (await fetch(`${base}/health`)).text();
  assert.equal(health.includes(key), false);
  assert.equal(health.includes(code), false);
});
test("validates key/model/unknown fields and preserves previous configuration", async (t) => {
  const { put, configuration } = await fixture(t);
  await put();
  for (const body of [
    { apiKey: "short", model: "gemini-2.5-flash" },
    { apiKey: key, model: "../../escape" },
    { apiKey: key, model: "gemini-2.5-flash", extra: "unexpected" },
  ]) {
    const r = await put(body);
    assert.equal(r.status, 400);
  }
  assert.equal(configuration.current().apiKey, key);
});
test("clearing a session override restores environment configuration", async (t) => {
  const { put, base, configuration } = await fixture(t, {
    apiKey: "environment-only-fake-credential",
    model: "gemini-test",
  });
  await put();
  const r = await fetch(`${base}/config`, {
    method: "DELETE",
    headers: { "x-pixora-setup-token": code },
  });
  assert.equal(r.status, 200);
  assert.equal(
    configuration.current().apiKey,
    "environment-only-fake-credential",
  );
  assert.equal(configuration.status().model, "gemini-test");
  assert.equal(configuration.status().keySource, "environment");
  assert.equal(
    (await r.text()).includes("environment-only-fake-credential"),
    false,
  );
});
test("clearing a session key disconnects when no environment fallback exists", async (t) => {
  const { put, base, configuration } = await fixture(t);
  await put();
  await fetch(`${base}/config`, {
    method: "DELETE",
    headers: { "x-pixora-setup-token": code },
  });
  assert.equal(configuration.status().configured, false);
  assert.equal(configuration.current().apiKey, "");
});
test("setup is disabled when no sufficiently long server-admin code is configured", async (t) => {
  const { put, configuration } = await fixture(t, { setupToken: "" });
  const r = await put();
  assert.equal(r.status, 503);
  assert.equal(configuration.status().setupEnabled, false);
});
test("five setup attempts are allowed and subsequent attempts are rate limited", async (t) => {
  const { put } = await fixture(t);
  for (let i = 0; i < 5; i++)
    assert.equal((await put(undefined, "incorrect")).status, 401);
  assert.equal((await put()).status, 429);
});
