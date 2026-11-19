"use client";

import { useActionState, type ReactNode } from "react";
import type { ActionState } from "@/lib/validation";

type Props = {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  children: ReactNode;
  submitLabel: string;
  className?: string;
  secondary?: boolean;
};
export function ActionForm({
  action,
  children,
  submitLabel,
  className = "",
  secondary = false,
}: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className={`action-form ${className}`}>
      <fieldset disabled={pending}>{children}</fieldset>
      <div aria-live="polite">
        {state.error && (
          <p className="feedback error" role="alert">
            {state.error}
          </p>
        )}
        {state.success && <p className="feedback success">{state.success}</p>}
      </div>
      <button
        className={secondary ? "button secondary" : "button"}
        disabled={pending}
      >
        {pending ? "Working…" : submitLabel}
      </button>
    </form>
  );
}
