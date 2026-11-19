"use client";

import { useEffect, useRef } from "react";

export function AccountMenu({
  summary,
  children,
}: {
  summary: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node))
        ref.current.open = false;
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && ref.current?.open) {
        ref.current.open = false;
        ref.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, []);
  return (
    <details
      ref={ref}
      className="account-menu"
      onClick={(event) => {
        if ((event.target as Element).closest("a") && ref.current)
          ref.current.open = false;
      }}
    >
      <summary>{summary}</summary>
      <div className="account-dropdown">{children}</div>
    </details>
  );
}
