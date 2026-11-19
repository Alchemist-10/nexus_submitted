import Link from "next/link";
import { ArrowUpRight, Layers } from "lucide-react";
import { currentUser } from "@/lib/auth/session";
import { signOut } from "@/features/auth/actions";

export async function Navigation() {
  const user = await currentUser();
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
          <Link href="/#mentors">Find a mentor</Link>
          {user ? (
            <>
              <Link href="/dashboard">My sessions</Link>
              <Link className="nav-mentor" href="/dashboard/mentor">
                Mentor studio <ArrowUpRight size={14} />
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
