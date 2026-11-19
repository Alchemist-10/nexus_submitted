export function formatINR(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: paise % 100 ? 2 : 0,
  }).format(paise / 100);
}
export function parseINR(value: string): number | null {
  if (!value.trim()) return null;
  if (!/^\d{1,5}(\.\d{1,2})?$/.test(value.trim()))
    throw new Error("INVALID_PRICE");
  const [rupees, decimals = ""] = value.trim().split(".");
  const paise = Number(rupees) * 100 + Number(decimals.padEnd(2, "0"));
  if (paise < 100 || paise > 2500000) throw new Error("INVALID_PRICE");
  return paise;
}
export const paymentStateLabel: Record<string, string> = {
  awaiting_payment: "Awaiting payment",
  paid: "Payment confirmed",
  expired: "Checkout expired or cancelled",
  refund_pending: "Full refund pending",
  refunded: "Full refund processed",
  action_required: "Payment needs review — contact Nexus support",
};
