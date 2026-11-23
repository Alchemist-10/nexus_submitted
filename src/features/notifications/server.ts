import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { supabaseEnv } from "@/lib/env";
import { deliveryConfig, sendNotification } from "./transport";
import { runNotificationBatch, type NotificationStore } from "./worker";

export function notificationAdmin() {
  const { url } = supabaseEnv();
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY_REQUIRED");
  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
function checked<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw new Error("NOTIFICATION_DATABASE_ERROR");
  return result.data;
}
export function notificationStore(): NotificationStore {
  const db = notificationAdmin();
  return {
    claim: async (limit) =>
      checked(await db.rpc("notification_claim_jobs", { p_limit: limit })) ||
      [],
    prepare: async (claim) =>
      checked(
        await db.rpc("notification_prepare_job", {
          p_id: claim.id,
          p_token: claim.lease_token,
        }),
      ),
    finish: async (claim, outcome, providerId, error) =>
      checked(
        await db.rpc("notification_finish_job", {
          p_id: claim.id,
          p_token: claim.lease_token,
          p_outcome: outcome,
          ...(providerId ? { p_provider_id: providerId } : {}),
          ...(error ? { p_error: error } : {}),
        }),
      ) === true,
  };
}
export async function processNotificationJobs() {
  const config = deliveryConfig(); // Fail closed before claiming anything.
  return runNotificationBatch(notificationStore(), (message) =>
    sendNotification(message, config),
  );
}
export async function notificationStatus() {
  return checked(await notificationAdmin().rpc("notification_job_status"));
}
