"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export function SessionRefresh({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const refresh = () => {
      if (
        document.visibilityState === "visible" &&
        !document.querySelector("fieldset[disabled]")
      )
        router.refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const timer = window.setInterval(refresh, 15000);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.clearInterval(timer);
    };
  }, [active, router]);
  return active ? (
    <button
      type="button"
      className="text-link session-refresh"
      onClick={() => router.refresh()}
    >
      Refresh session status
    </button>
  ) : null;
}
