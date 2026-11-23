import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { hostedWorkerHandler } from "../src/features/workers/handler";
const secret = "a".repeat(64);
test("signed cron calls are time-bound, authenticated before nonce access and single-use", async () => {
  let claims = 0,
    calls = 0;
  const seen = new Set<string>();
  const task = async () => {
    calls++;
    return [];
  };
  const handler = hostedWorkerHandler({
    secret,
    enabled: true,
    notifications: task,
    payments: task,
    claimDispatch: async (nonce) => {
      claims++;
      if (seen.has(nonce)) return false;
      seen.add(nonce);
      return true;
    },
  });
  const timestamp = String(Math.floor(Date.now() / 1000)),
    nonce = randomUUID();
  const headers = {
    "x-nexus-timestamp": timestamp,
    "x-nexus-nonce": nonce,
    "x-nexus-signature": createHmac("sha256", secret)
      .update(`nexus-workers:${timestamp}:${nonce}`)
      .digest("hex"),
  };
  const request = () =>
    new Request("https://nexus.example", { method: "POST", headers });
  assert.equal((await handler(request())).status, 200);
  assert.equal((await handler(request())).status, 409);
  assert.equal(calls, 2);
  headers["x-nexus-signature"] = "b".repeat(64);
  assert.equal((await handler(request())).status, 401);
  assert.equal(claims, 2);
  headers["x-nexus-timestamp"] = String(Number(timestamp) - 300);
  assert.equal((await handler(request())).status, 401);
  assert.equal(claims, 2);
});
test("hosted jobs reject missing/wrong secrets and disabled configuration before side effects", async () => {
  let calls = 0;
  const task = async () => {
    calls++;
    return [];
  };
  for (const token of [null, "Bearer " + "b".repeat(64), "Bearer short"]) {
    const request = new Request("https://nexus.example/api/internal/workers", {
      method: "POST",
      headers: token ? { authorization: token } : {},
    });
    const response = await hostedWorkerHandler({
      secret,
      enabled: true,
      notifications: task,
      payments: task,
    })(request);
    assert.equal(response.status, 401);
  }
  const r = await hostedWorkerHandler({
    secret,
    enabled: false,
    notifications: task,
    payments: task,
  })(new Request("https://nexus.example"));
  assert.equal(r.status, 503);
  assert.equal(calls, 0);
});
test("authorized bounded tasks run independently and responses omit records/secrets", async () => {
  const task = async () => [
    { id: "private-record", email: "private@example.com" },
  ];
  let ran = false;
  const handler = hostedWorkerHandler({
    secret,
    enabled: true,
    notifications: async () => {
      throw Error("provider secret");
    },
    payments: async () => {
      ran = true;
      return task();
    },
  });
  const response = await handler(
    new Request("https://nexus.example", {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
    }),
  );
  assert.equal(response.status, 503);
  assert.ok(ran);
  assert.deepEqual(await response.json(), {
    notifications: { ok: false },
    payments: { ok: true, processed: 1 },
  });
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});
