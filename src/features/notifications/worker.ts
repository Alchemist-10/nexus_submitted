import { z } from "zod";
import { messageSchema, type NotificationMessage } from "./shared";
import { DeliveryError } from "./transport";

export type Claim = { id: string; lease_token: string };
export type NotificationStore = {
  claim: (limit: number) => Promise<Claim[]>;
  prepare: (claim: Claim) => Promise<unknown>;
  finish: (
    claim: Claim,
    outcome: "previewed" | "accepted" | "retry" | "review",
    providerId?: string,
    error?: string,
  ) => Promise<boolean>;
};
export async function runNotificationBatch(
  store: NotificationStore,
  deliver: (
    message: NotificationMessage,
  ) => Promise<{ outcome: "previewed" | "accepted"; providerId: string }>,
  limit = 10,
) {
  const jobs = z
    .array(z.object({ id: z.uuid(), lease_token: z.uuid() }))
    .parse(await store.claim(limit));
  const results: { id: string; outcome: string }[] = [];
  // Parallel sends keep a bounded batch comfortably within its two-minute leases.
  for (let offset = 0; offset < jobs.length; offset += 5) {
    await Promise.all(
      jobs.slice(offset, offset + 5).map(async (job) => {
        let payload: unknown;
        try {
          payload = await store.prepare(job);
        } catch {
          results.push({ id: job.id, outcome: "prepare_failed" });
          return;
        }
        if (!payload) {
          results.push({ id: job.id, outcome: "suppressed_or_stale" });
          return;
        }
        let outcome: "accepted" | "previewed" | "retry" | "review";
        let providerId: string | undefined, error: string | undefined;
        try {
          const parsed = messageSchema.safeParse(payload);
          if (!parsed.success)
            throw new DeliveryError("INVALID_MESSAGE", false);
          const result = await deliver(parsed.data);
          outcome = result.outcome;
          providerId = result.providerId;
        } catch (e) {
          const failure =
            e instanceof DeliveryError
              ? e
              : new DeliveryError("DELIVERY_FAILED");
          outcome = failure.retryable ? "retry" : "review";
          error = failure.code;
        }
        try {
          const acknowledged = await store.finish(
            job,
            outcome,
            providerId,
            error,
          );
          results.push({
            id: job.id,
            outcome: acknowledged ? outcome : "acknowledgement_lost",
          });
        } catch {
          results.push({ id: job.id, outcome: "acknowledgement_lost" });
        }
      }),
    );
  }
  return results;
}
