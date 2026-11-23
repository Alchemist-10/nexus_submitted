import { randomUUID } from "node:crypto";
import {
  createDatabase,
  resetFixtures,
  asUser,
  makeSlot,
  people,
  type DB,
} from "../tests/helpers/database";
import {
  deliveryConfig,
  sendNotification,
} from "../src/features/notifications/transport";
import {
  runNotificationBatch,
  type NotificationStore,
  type Claim,
} from "../src/features/notifications/worker";

async function run() {
  if (process.env.DATABASE_TEST_URL)
    throw new Error(
      "Demo requires its own in-memory PGlite database. Unset DATABASE_TEST_URL.",
    );
  const db = await createDatabase();
  try {
    await resetFixtures(db);
    const slot = await makeSlot(db);
    await asUser(db, people.learner, (a) =>
      a.query("select * from book_free_intro($1,$2)", [slot.id, randomUUID()]),
    );
    const trusted = <T>(fn: (a: DB) => Promise<T>) =>
      db.transaction(async (a) => {
        await a.exec("set local role service_role");
        return fn(a);
      });
    const store: NotificationStore = {
      claim: async (n) =>
        (
          await trusted((a) =>
            a.query<Claim>("select * from notification_claim_jobs($1)", [n]),
          )
        ).rows,
      prepare: async (c) =>
        (
          await trusted((a) =>
            a.query("select notification_prepare_job($1,$2) as payload", [
              c.id,
              c.lease_token,
            ]),
          )
        ).rows[0].payload,
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
    const config = deliveryConfig({
      NOTIFICATION_TRANSPORT: "preview",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    });
    console.log(
      "Isolated demo: actual booking, queue and worker; preview only, no hosted writes or email.",
    );
    console.log(
      JSON.stringify({
        step: "booking confirmations",
        results: await runNotificationBatch(store, (m) =>
          sendNotification(m, config),
        ),
      }),
    );
    // Accelerate only disposable job deadlines, never hosted session times.
    await db.exec(
      "update app_private.notification_jobs set due_at=now() where state='pending'",
    );
    console.log(
      JSON.stringify({
        step: "accelerated 24-hour, 15-minute and missing-link reminders",
        results: await runNotificationBatch(store, (m) =>
          sendNotification(m, config),
        ),
      }),
    );
    console.log(`HTML/text previews: ${config.previewDir}`);
  } finally {
    await db.close();
  }
}
run().catch(() => {
  console.error("Local notification demo failed; check test configuration.");
  process.exitCode = 1;
});
