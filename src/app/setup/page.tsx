import Link from "next/link";
import { Database, ArrowUpRight } from "lucide-react";
export default function SetupPage() {
  return (
    <div className="shell narrow page-space">
      <span className="eyebrow">WORKSPACE SETUP</span>
      <h1>Give Nexus a new home.</h1>
      <p className="lead">
        The original database was deleted. This clean version needs a new
        Supabase project or a local Supabase stack.
      </p>
      <div className="panel">
        <Database size={28} />
        <h2>Connect once. Build from a clean foundation.</h2>
        <ol className="setup-list">
          <li>
            Create a new Supabase project, or start the local CLI stack with
            Docker.
          </li>
          <li>
            Apply the migration in <code>supabase/migrations/</code>. The README
            includes both setup paths.
          </li>
          <li>
            Copy <code>.env.example</code> to <code>.env.local</code> and add
            the new project URL and publishable key.
          </li>
          <li>
            Set the Auth Site URL and confirmation redirect URL, then restart
            the dev server.
          </li>
        </ol>
        <p className="muted">
          Local seed accounts and the offline database tests are documented in
          README.md. No service-role key is needed by the app.
        </p>
      </div>
      <Link className="text-link" href="/">
        Back to Nexus <ArrowUpRight size={16} />
      </Link>
    </div>
  );
}
