import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { currentProfile } from "@/features/profiles/queries";
import { ArrowUpRight, Layers } from "lucide-react";
import { currentUser } from "@/lib/auth/session";
import { signOut } from "@/features/auth/actions";

export async function Navigation() {
  const user = await currentUser();
  const profile = await currentProfile();
  return (
    <header className="site-header">
      <div className="shell nav-inner">
        <Link href="/" className="brand" aria-label="Nexus home">
          <span className="brand-mark">
            <Layers size={20} />
          </span>
          nexus<span className="brand-dot">.</span>
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/">Community</Link>
          <Link href="/mentors">Find a mentor</Link>
          {user ? (
            <>
              <Link href="/dashboard">My sessions</Link>
              <Link className="nav-mentor" href="/dashboard/mentor">
                Mentor studio <ArrowUpRight size={14} />
              </Link>
              <Link
                className="nav-profile"
                href="/profile"
                aria-label={`My profile: ${profile?.full_name || "Nexus member"}`}
              >
                <Avatar
                  id={user.id}
                  name={profile?.full_name || "Nexus member"}
                  variant={profile?.avatar_variant}
                  path={profile?.avatar_path}
                  size="small"
                />
                <span>
                  <small>My profile</small>
                  <strong>{profile?.full_name || "Nexus member"}</strong>
                </span>
              </Link>
              <form action={signOut}>
                <button className="text-button">Sign out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">Sign in</Link>
              <Link className="button small" href="/signup">
                Join Nexus <ArrowUpRight size={15} />
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
