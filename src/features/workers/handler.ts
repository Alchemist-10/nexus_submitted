import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

type Task = () => Promise<unknown[]>;
export function hostedWorkerHandler({
  secret,
  enabled,
  notifications,
  payments,
  claimDispatch,
}: {
  secret?: string;
  enabled: boolean;
  notifications: Task;
  payments: Task;
  claimDispatch?: (nonce: string, timestamp: number) => Promise<boolean>;
}) {
  return async (request: Request) => {
    const json = (body: unknown, status = 200) =>
      Response.json(body, {
        status,
        headers: { "Cache-Control": "private, no-store" },
      });
    if (!enabled || !secret || !/^[a-f0-9]{64}$/i.test(secret))
      return json({ error: "Worker unavailable" }, 503);
    const token = request.headers
      .get("authorization")
      ?.match(/^Bearer ([a-f0-9]{64})$/i)?.[1];
    const manual = Boolean(
      token && timingSafeEqual(Buffer.from(token), Buffer.from(secret)),
    );
    if (!manual) {
      const timestamp = request.headers.get("x-nexus-timestamp") || "";
      const nonce = request.headers.get("x-nexus-nonce") || "";
      const signature = request.headers.get("x-nexus-signature") || "";
      if (
        !/^\d{10}$/.test(timestamp) ||
        !z.uuid().safeParse(nonce).success ||
        !/^[a-f0-9]{64}$/.test(signature) ||
        Math.abs(Date.now() / 1000 - Number(timestamp)) > 120 ||
        !claimDispatch
      )
        return json({ error: "Unauthorized" }, 401);
      const expected = createHmac("sha256", secret)
        .update(`nexus-workers:${timestamp}:${nonce}`)
        .digest("hex");
      if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected)))
        return json({ error: "Unauthorized" }, 401);
      try {
        if (!(await claimDispatch(nonce, Number(timestamp))))
          return json({ error: "Duplicate or expired dispatch" }, 409);
      } catch {
        return json({ error: "Worker unavailable" }, 503);
      }
    }
    const results = await Promise.allSettled([
      Promise.resolve().then(notifications),
      Promise.resolve().then(payments),
    ]);
    const summarize = (result: PromiseSettledResult<unknown[]>) =>
      result.status === "fulfilled"
        ? { ok: true, processed: result.value.length }
        : { ok: false };
    return json(
      { notifications: summarize(results[0]), payments: summarize(results[1]) },
      results.every((r) => r.status === "fulfilled") ? 200 : 503,
    );
  };
}
