import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { signUp } from "@/features/auth/actions";
import { isConfigured } from "@/lib/env";
import { StudioIllustration } from "@/components/studio-illustration";

export default function SignupPage() {
  return (
    <div className="shell auth-layout">
      <div className="auth-intro">
        <span className="eyebrow">A PLACE TO GROW</span>
        <h1>
          Bring your
          <br />
          curiosity.
        </h1>
        <p className="lead">
          Learn something new. Share what you know. Start with one free
          introduction per mentor.
        </p>
        <div className="auth-studio-art">
          <StudioIllustration />
        </div>
      </div>
      <div className="panel auth-panel">
        <h2>Find your people.</h2>
        <p className="muted">Create your Nexus account.</p>
        {!isConfigured() && (
          <p className="feedback">
            <Link href="/setup">Connect the new database</Link> to enable
            accounts.
          </p>
        )}
        <ActionForm action={signUp} submitLabel="Create account">
          <label>
            Your name
            <input
              name="fullName"
              autoComplete="name"
              minLength={2}
              maxLength={80}
              required
            />
          </label>
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
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
            <small>At least 12 characters.</small>
          </label>
        </ActionForm>
        <p className="form-switch">
          Already a member? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
