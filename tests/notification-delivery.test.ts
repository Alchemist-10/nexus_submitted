import { after, afterEach, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import {
  createDatabase,
  resetFixtures,
  asUser,
  makeSlot,
  people,
  type DB,
} from "./helpers/database";
import {
  deliveryConfig,
  sendNotification,
  DeliveryError,
  type DeliveryConfig,
} from "../src/features/notifications/transport";
import { renderNotification } from "../src/features/notifications/render";
import {
  runNotificationBatch,
  type NotificationStore,
} from "../src/features/notifications/worker";
import type { NotificationMessage } from "../src/features/notifications/shared";

const originalFetch = globalThis.fetch;
let db: DB, dir: string;
before(async () => {
  db = await createDatabase();
  await mkdir("artifacts", { recursive: true });
  dir = await mkdtemp(resolve("artifacts/notification-test-"));
});
beforeEach(async () => {
  await resetFixtures(db);
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});
after(async () => {
  await db?.close();
  if (dir && dir.startsWith(resolve("artifacts/notification-test-")))
    await rm(dir, { recursive: true, force: true });
});
const message = (): NotificationMessage => ({
  id: randomUUID(),
  bookingId: randomUUID(),
  kind: "booking_confirmed",
  counterpartName: '<img src=x onerror="alert(1)">',
  startsAt: "2026-12-01T10:00:00Z",
  endsAt: "2026-12-01T10:30:00Z",
  sessionKind: "intro",
  recipientEmail: "learner@nexus.test",
});
const config = (): DeliveryConfig => ({
  ...deliveryConfig({ NEXT_PUBLIC_APP_URL: "https://nexus.example" }),
  previewDir: dir,
});
const trusted = <T>(fn: (a: DB) => Promise<T>) =>
  db.transaction(async (a) => {
    await a.exec("set local role service_role");
    return fn(a);
  });
function store(): NotificationStore {
  return {
    claim: async (limit) =>
      (
        await trusted((a) =>
          a.query("select * from notification_claim_jobs($1)", [limit]),
        )
      ).rows as { id: string; lease_token: string }[],
    prepare: async (c) =>
      (
        await trusted((a) =>
          a.query("select notification_prepare_job($1,$2) as p", [
            c.id,
            c.lease_token,
          ]),
        )
      ).rows[0].p,
    finish: async (c, outcome, id, error) =>
      (
        await trusted((a) =>
          a.query("select notification_finish_job($1,$2,$3,$4,$5) as ok", [
            c.id,
            c.lease_token,
            outcome,
            id ?? null,
            error ?? null,
          ]),
        )
      ).rows[0].ok as boolean,
  };
}
async function booking() {
  const slot = await makeSlot(db);
  return (
    await asUser(db, people.learner, (a) =>
      a.query("select * from book_free_intro($1,$2)", [slot.id, randomUUID()]),
    )
  ).rows[0];
}

test("preview defaults never call a provider and retries reuse safely escaped artifacts", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw new Error("no network");
  };
  const m = message();
  const first = await sendNotification(m, config());
  const second = await sendNotification(m, config());
  assert.equal(first.outcome, "previewed");
  assert.deepEqual(first, second);
  assert.equal(calls, 0);
  const html = await readFile(resolve(dir, `${m.id}.html`), "utf8");
  assert.ok(html.includes("&lt;img"));
  assert.ok(!html.includes("<img src=x"));
  assert.ok(html.includes("UTC"));
  assert.ok(html.includes(`/bookings/${m.bookingId}`));
  assert.ok(!html.includes("meet.google.com"));
  assert.equal(
    (await readdir(dir)).filter((p) => p.startsWith(m.id)).length,
    2,
  );
  const paid = renderNotification(
    { ...m, sessionKind: "paid" },
    "https://nexus.example",
  );
  assert.match(paid.text, /test-mode.*no real charge/);
});

test("invalid config fails closed; real email requires an exact recipient allowlist", async () => {
  assert.throws(
    () => deliveryConfig({ NOTIFICATION_TRANSPORT: "smtp" }),
    /INVALID_TRANSPORT/,
  );
  assert.throws(
    () => deliveryConfig({ NOTIFICATION_TRANSPORT: "resend" }),
    /EMAIL_CONFIGURATION_REQUIRED/,
  );
  assert.throws(
    () => deliveryConfig({ NEXT_PUBLIC_APP_URL: "http://nexus.example" }),
    /INVALID_ORIGIN/,
  );
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return Response.json({ id: "email_test" });
  };
  const cfg = {
    ...config(),
    transport: "resend" as const,
    apiKey: "test-secret",
    from: "Nexus <notify@nexus.example>",
    allowlist: ["allowed@example.com"],
  };
  await assert.rejects(
    sendNotification(message(), cfg),
    /RECIPIENT_NOT_ALLOWLISTED/,
  );
  assert.equal(calls, 0);
});

test("hosted previews require private cloud persistence and never fall back to local files or email", async () => {
  const m = message();
  const cfg = { ...config(), previewStorage: "supabase" as const };
  await assert.rejects(sendNotification(m, cfg), /CLOUD_PREVIEW_REQUIRED/);
  const writes: string[] = [];
  const r = await sendNotification(m, cfg, async (id, content) => {
    writes.push(id);
    assert.match(content.html, /Open your session/);
  });
  assert.equal(r.outcome, "previewed");
  assert.deepEqual(writes, [m.id]);
  await assert.rejects(
    sendNotification(m, cfg, async () => {
      throw new Error("storage unavailable");
    }),
    /storage unavailable/,
  );
  assert.throws(
    () => deliveryConfig({ NOTIFICATION_PREVIEW_STORAGE: "public" }),
    /INVALID_PREVIEW_STORAGE/,
  );
});

test("provider retries use identical bodies and idempotency keys; failures are sanitized", async () => {
  const cfg = {
    ...config(),
    transport: "resend" as const,
    apiKey: "test-secret",
    from: "Nexus <notify@nexus.example>",
    allowlist: ["learner@nexus.test"],
  };
  const requests: RequestInit[] = [];
  globalThis.fetch = async (_url, init) => {
    requests.push(init!);
    return Response.json({ id: "email_test" });
  };
  const m = message();
  assert.equal((await sendNotification(m, cfg)).outcome, "accepted");
  await sendNotification(m, cfg);
  assert.equal(requests[0].body, requests[1].body);
  assert.equal(
    new Headers(requests[0].headers).get("Idempotency-Key"),
    `nexus-notification/${m.id}`,
  );
  globalThis.fetch = async () =>
    new Response("private provider details", { status: 429 });
  await assert.rejects(
    sendNotification(m, cfg),
    (e) =>
      e instanceof DeliveryError &&
      e.retryable &&
      e.code === "EMAIL_HTTP_429" &&
      !e.message.includes("private"),
  );
  globalThis.fetch = async () =>
    new Response("invalid sender", { status: 422 });
  await assert.rejects(
    sendNotification(m, cfg),
    (e) => e instanceof DeliveryError && !e.retryable,
  );
  globalThis.fetch = async () => {
    throw new Error("private connection info");
  };
  await assert.rejects(sendNotification(m, cfg), /EMAIL_NETWORK_ERROR/);
});

test("actual worker recovers provider outages with stable payloads and no repeated accepted jobs", async () => {
  await booking();
  let fail = true;
  const delivered: NotificationMessage[] = [];
  const deliver = async (m: NotificationMessage) => {
    delivered.push(m);
    if (fail) throw new DeliveryError("EMAIL_HTTP_503");
    return { outcome: "accepted" as const, providerId: "provider_test" };
  };
  const first = await runNotificationBatch(store(), deliver);
  assert.equal(first.length, 2);
  assert.ok(first.every((r) => r.outcome === "retry"));
  await db.exec(
    "update app_private.notification_jobs set due_at=now() where attempts>0",
  );
  fail = false;
  const second = await runNotificationBatch(store(), deliver);
  assert.ok(second.every((r) => r.outcome === "accepted"));
  assert.equal((await runNotificationBatch(store(), deliver)).length, 0);
  assert.deepEqual(
    delivered.slice(0, 2).sort((a, b) => a.id.localeCompare(b.id)),
    delivered.slice(2).sort((a, b) => a.id.localeCompare(b.id)),
  );
});

test("lost acknowledgement recovers through the provider key; cancellation prevents queued sends", async () => {
  const b = await booking();
  const real = store();
  let sent = 0;
  const providerKeys = new Set<string>();
  const deliver = async (m: NotificationMessage) => {
    if (!providerKeys.has(m.id)) {
      sent++;
      providerKeys.add(m.id);
    }
    return { outcome: "accepted" as const, providerId: "provider_test" };
  };
  const lost = {
    ...real,
    finish: async () => {
      throw new Error("database unavailable");
    },
  };
  const first = await runNotificationBatch(lost, deliver);
  assert.ok(first.every((r) => r.outcome === "acknowledgement_lost"));
  await db.exec(
    "update app_private.notification_jobs set leased_until=now()-interval '1 second' where attempts>0",
  );
  await runNotificationBatch(real, deliver);
  assert.equal(sent, 2);
  await asUser(db, people.learner, (a) =>
    a.query("select * from cancel_free_intro($1)", [b.id]),
  );
  await db.exec(
    "update app_private.notification_jobs set due_at=now() where state='pending'",
  );
  const results = await runNotificationBatch(real, async (m) => {
    assert.equal(m.kind, "booking_cancelled");
    return { outcome: "previewed", providerId: "preview" };
  });
  assert.equal(results.length, 2);
});
