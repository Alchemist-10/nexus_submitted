"use client";
import Link from "next/link";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatINR, paymentStateLabel } from "@/features/payments/shared";

type Status = {
  status: string;
  paymentState: string;
  expiresAt: string | null;
};
type Options = {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  timeout: number;
  theme: { color: string };
  handler: (result: {
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  modal: { ondismiss: () => void };
};
type Checkout = {
  open: () => void;
  close: () => void;
  on: (event: string, callback: () => void) => void;
};
declare global {
  interface Window {
    Razorpay?: new (options: Options) => Checkout;
  }
}

export function PaymentCheckout({
  id,
  amount,
  mentorName,
  initial,
  configured,
  serverNow,
}: {
  id: string;
  amount: number;
  mentorName: string;
  initial: Status;
  configured: boolean;
  serverNow: number;
}) {
  const [status, setStatus] = useState(initial),
    [now, setNow] = useState(serverNow),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const checkoutRef = useRef<Checkout | null>(null),
    verifying = useRef(false);
  const seconds = Math.max(
    0,
    Math.ceil((Date.parse(status.expiresAt || "") - now) / 1000),
  );
  const pending = status.status === "awaiting_payment",
    active = pending && seconds > 0;
  const refresh = useCallback(async () => {
    const response = await fetch(`/api/payments/${id}/status`, {
      method: "POST",
      cache: "no-store",
    });
    const body = await response.json();
    if (!response.ok)
      throw new Error(body.error || "Payment status could not be checked.");
    setStatus(body as Status);
    setNow(Date.now());
    return body as Status;
  }, [id]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!pending && status.paymentState !== "refund_pending") return;
    const update = () => {
      if (document.visibilityState === "visible")
        void refresh().catch(() => {});
    };
    const timer = setInterval(update, 15000);
    window.addEventListener("focus", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", update);
    };
  }, [pending, status.paymentState, refresh]);
  useEffect(() => () => checkoutRef.current?.close(), []);

  async function pay() {
    if (busy || !active || !window.Razorpay) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/payments/${id}/prepare`, {
        method: "POST",
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "Checkout could not be opened.");
      if (!body.checkout) {
        await refresh();
        setBusy(false);
        setMessage(
          "Checkout is being prepared or has expired. Check its status before trying again.",
        );
        return;
      }
      const data = body.checkout as {
        keyId: string;
        orderId: string;
        amount: number;
        currency: string;
      };
      const checkout = new window.Razorpay({
        key: data.keyId,
        order_id: data.orderId,
        amount: data.amount,
        currency: data.currency,
        name: "Nexus · Test mode",
        description: `Mentorship session with ${mentorName}`,
        theme: { color: "#742b3c" },
        timeout: Math.max(1, seconds),
        modal: {
          ondismiss: () => {
            if (!verifying.current) {
              setBusy(false);
              setMessage(
                "Checkout closed. No booking is confirmed yet. You can resume while your reservation is active.",
              );
            }
          },
        },
        handler: (result) => {
          verifying.current = true;
          void (async () => {
            try {
              const verified = await fetch(`/api/payments/${id}/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
                body: JSON.stringify({
                  paymentId: result.razorpay_payment_id,
                  signature: result.razorpay_signature,
                }),
              });
              const outcome = await verified.json();
              if (!verified.ok)
                throw new Error(
                  outcome.error ||
                    "Payment verification is pending. Check the status before retrying.",
                );
              setStatus(outcome as Status);
              setMessage(
                outcome.status === "confirmed"
                  ? "Payment verified. Your session is confirmed."
                  : "Your payment is being checked. This page will update when verification finishes.",
              );
            } catch (e) {
              setMessage(
                e instanceof Error
                  ? e.message
                  : "Check payment status before retrying.",
              );
            } finally {
              verifying.current = false;
              setBusy(false);
            }
          })();
        },
      });
      checkout.on("payment.failed", () =>
        setMessage(
          "That payment attempt failed. You can retry within checkout while the reservation is active.",
        ),
      );
      checkoutRef.current = checkout;
      checkout.open();
    } catch (e) {
      setBusy(false);
      setMessage(
        e instanceof Error
          ? e.message
          : "Checkout is unavailable. Please check payment status before retrying.",
      );
    }
  }
  return (
    <div className="payment-checkout">
      {configured && (
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="afterInteractive"
          onReady={() => setReady(true)}
          onError={() =>
            setMessage(
              "Razorpay could not load. Check your connection and refresh this page.",
            )
          }
        />
      )}
      <p className="payment-mode">
        Razorpay test mode · No real money is charged
      </p>
      <h2>
        {status.status === "confirmed"
          ? "Your session is confirmed."
          : pending
            ? "Confirm your next conversation."
            : "Your payment status"}
      </h2>
      <p className="lead">
        {formatINR(amount)} <span className="muted">for this session</span>
      </p>
      <p className="feedback" role="status">
        {pending && seconds === 0
          ? "Reservation expired. This booking is not confirmed."
          : paymentStateLabel[status.paymentState] || "Checking payment"}
      </p>
      {active && (
        <p>
          Your slot is reserved for{" "}
          <strong>
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
          </strong>
          . Closing this page does not confirm a booking.
        </p>
      )}
      {pending && !configured && (
        <p className="feedback">
          Test checkout is being configured. Please return when payments are
          enabled.
        </p>
      )}
      {active && configured && (
        <button
          className="button"
          onClick={() => void pay()}
          disabled={busy || !ready}
        >
          {busy
            ? "Waiting for payment…"
            : !ready
              ? "Loading secure checkout…"
              : `Pay ${formatINR(amount)} and confirm · Test`}
        </button>
      )}
      <div aria-live="polite">
        {message && <p className="feedback">{message}</p>}
      </div>
      <div className="payment-actions">
        <button
          className="button secondary"
          disabled={busy}
          onClick={() =>
            void refresh()
              .then(() => setMessage("Payment status updated."))
              .catch((e) => setMessage(e.message))
          }
        >
          Check payment status
        </button>
        <Link className="text-link" href="/dashboard">
          My sessions
        </Link>
      </div>
      <p className="muted">
        Cancel before the scheduled start for a full refund. Refund processing
        is shown separately from cancellation.
      </p>
    </div>
  );
}
