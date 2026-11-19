import { setTimeout } from "node:timers/promises";
import {
  paymentConfigured,
  processPaymentJobs,
} from "../src/features/payments/server";

async function run() {
  if (!paymentConfigured())
    throw new Error(
      "Configure the Razorpay test keys, webhook secret and Supabase server secret in .env.local first.",
    );
  do {
    const results = await processPaymentJobs();
    console.log(
      JSON.stringify({
        processed: results.length,
        completed: results.filter((r) => r.done).length,
        retrying: results.filter((r) => !r.done).length,
      }),
    );
    if (!process.argv.includes("--watch")) break;
    await setTimeout(30000);
  } while (true);
}
run().catch(() => {
  console.error(
    "Payment worker could not run. Check configuration and connectivity; durable jobs remain queued.",
  );
  process.exitCode = 1;
});
