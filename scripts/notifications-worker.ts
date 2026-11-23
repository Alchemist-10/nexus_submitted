import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { setTimeout } from "node:timers/promises";

async function run() {
  if (existsSync(".env.local")) loadEnvFile(".env.local");
  const { processNotificationJobs, notificationStatus } =
    await import("../src/features/notifications/server");
  if (process.argv.includes("--status")) {
    console.log(JSON.stringify(await notificationStatus()));
    return;
  }
  let stopped = false;
  const stop = () => {
    stopped = true;
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  do {
    try {
      const results = await processNotificationJobs();
      const counts: Record<string, number> = {};
      for (const r of results) counts[r.outcome] = (counts[r.outcome] || 0) + 1;
      console.log(
        JSON.stringify({ processed: results.length, outcomes: counts }),
      );
    } catch {
      console.error(
        "Notification worker failed. Check private configuration/connectivity; queued jobs are preserved.",
      );
      if (!process.argv.includes("--watch")) {
        process.exitCode = 1;
        break;
      }
    }
    if (!process.argv.includes("--watch") || stopped) break;
    await setTimeout(15000);
  } while (!stopped);
}
run().catch(() => {
  console.error(
    "Notification worker could not start. Check private configuration.",
  );
  process.exitCode = 1;
});
