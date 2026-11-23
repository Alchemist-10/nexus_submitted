"use client";
import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function InboxRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    const refresh = () => {
      if (
        document.visibilityState === "visible" &&
        !document.querySelector("fieldset[disabled]")
      )
        router.refresh();
    };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);
  return (
    <button
      type="button"
      className="text-link"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      <RefreshCw size={15} aria-hidden="true" />{" "}
      {pending ? "Refreshing…" : "Refresh inbox"}
    </button>
  );
}
