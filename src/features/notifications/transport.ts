import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import { renderNotification } from "./render";
import type { NotificationMessage } from "./shared";

export class DeliveryError extends Error {
  constructor(
    public code: string,
    public retryable = true,
  ) {
    super(code);
  }
}
export type DeliveryConfig = {
  transport: "preview" | "resend";
  origin: string;
  previewDir: string;
  previewStorage?: "local" | "supabase";
  from?: string;
  apiKey?: string;
  allowlist: string[];
};
export function deliveryConfig(
  env: Record<string, string | undefined> = process.env,
): DeliveryConfig {
  const transport = env.NOTIFICATION_TRANSPORT || "preview";
  const previewStorage = env.NOTIFICATION_PREVIEW_STORAGE || "local";
  if (previewStorage !== "local" && previewStorage !== "supabase")
    throw new DeliveryError("INVALID_PREVIEW_STORAGE", false);
  if (transport !== "preview" && transport !== "resend")
    throw new DeliveryError("INVALID_TRANSPORT", false);
  const origin = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = new URL(origin);
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw new DeliveryError("INVALID_ORIGIN", false);
  const allowlist = (env.NOTIFICATION_EMAIL_ALLOWLIST || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (
    transport === "resend" &&
    (!env.RESEND_API_KEY ||
      !env.NOTIFICATION_EMAIL_FROM ||
      !allowlist.length ||
      allowlist.some((e) => !z.email().safeParse(e).success))
  )
    throw new DeliveryError("EMAIL_CONFIGURATION_REQUIRED", false);
  return {
    transport,
    origin: url.origin,
    previewDir: resolve("artifacts/notification-previews"),
    previewStorage,
    apiKey: env.RESEND_API_KEY,
    from: env.NOTIFICATION_EMAIL_FROM,
    allowlist,
  };
}
export async function sendNotification(
  message: NotificationMessage,
  config: DeliveryConfig,
  cloudPreview?: (
    id: string,
    content: ReturnType<typeof renderNotification>,
  ) => Promise<void>,
): Promise<{ outcome: "previewed" | "accepted"; providerId: string }> {
  const rendered = renderNotification(message, config.origin);
  if (config.transport === "preview") {
    if (config.previewStorage === "supabase") {
      if (!cloudPreview)
        throw new DeliveryError("CLOUD_PREVIEW_REQUIRED", false);
      await cloudPreview(message.id, rendered);
      return {
        outcome: "previewed",
        providerId: `private-preview:${message.id}`,
      };
    }
    await mkdir(config.previewDir, { recursive: true });
    // Stable job filenames make retries overwrite the same preview, not create duplicates.
    await writeFile(
      resolve(config.previewDir, `${message.id}.html`),
      rendered.html,
      { mode: 0o600 },
    );
    await writeFile(
      resolve(config.previewDir, `${message.id}.txt`),
      rendered.text,
      { mode: 0o600 },
    );
    return { outcome: "previewed", providerId: `preview:${message.id}` };
  }
  if (
    !message.recipientEmail ||
    !config.allowlist.includes(message.recipientEmail.toLowerCase())
  )
    throw new DeliveryError("RECIPIENT_NOT_ALLOWLISTED", false);
  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `nexus-notification/${message.id}`,
      },
      body: JSON.stringify({
        from: config.from,
        to: [message.recipientEmail],
        ...rendered,
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new DeliveryError("EMAIL_NETWORK_ERROR");
  }
  if (!response.ok)
    throw new DeliveryError(
      `EMAIL_HTTP_${response.status}`,
      response.status === 408 ||
        response.status === 429 ||
        response.status >= 500,
    );
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new DeliveryError("EMAIL_RESPONSE_UNCERTAIN");
  }
  const parsed = z.object({ id: z.string().min(1).max(200) }).safeParse(result);
  if (!parsed.success) throw new DeliveryError("EMAIL_RESPONSE_UNCERTAIN");
  return { outcome: "accepted", providerId: parsed.data.id };
}
