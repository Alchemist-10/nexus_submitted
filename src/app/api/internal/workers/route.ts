import { hostedWorkerHandler } from "@/features/workers/handler";
import {
  notificationAdmin,
  processNotificationJobs,
} from "@/features/notifications/server";
import { processPaymentJobs } from "@/features/payments/server";

export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  return hostedWorkerHandler({
    secret: process.env.WORKER_RUN_SECRET,
    enabled: process.env.HOSTED_WORKERS_ENABLED === "true",
    notifications: () => processNotificationJobs(5),
    payments: () => processPaymentJobs(undefined, 1),
    claimDispatch: async (nonce, timestamp) => {
      const { data, error } = await notificationAdmin().rpc(
        "claim_worker_dispatch",
        { p_nonce: nonce, p_timestamp: timestamp },
      );
      if (error) throw new Error("DISPATCH_CLAIM_FAILED");
      return data === true;
    },
  })(request);
}
