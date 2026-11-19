import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { signIn } from "@/features/auth/actions";
import { safeNext } from "@/lib/validation";
import { isConfigured } from "@/lib/env";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; notice?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="shell auth-layout">
      <div className="auth-intro">
        <span className="eyebrow">WELCOME BACK</span>
        <h1>
          A familiar face.
          <br />A fresh perspective.
        </h1>
        <p className="lead">Your next conversation is waiting.</p>
      </div>
      <div className="panel auth-panel">
        <h2>Sign in to Nexus</h2>
        <p className="muted">Good to see you again.</p>
        {!isConfigured() && (
          <p className="feedback">
            <Link href="/setup">Connect the new database</Link> to enable
            sign-in.
          </p>
        )}
        {params.notice === "confirmation-error" && (
          <p className="feedback error">
            That confirmation link could not be verified. Request a new email or
            try signing in.
          </p>
        )}
        <ActionForm action={signIn} submitLabel="Sign in">
          <input type="hidden" name="next" value={safeNext(params.next)} />
          <label>
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              maxLength={128}
              required
            />
          </label>
        </ActionForm>
        <p className="form-switch">
          New here? <Link href="/signup">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
