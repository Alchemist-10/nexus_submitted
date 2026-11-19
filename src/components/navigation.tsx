import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { currentProfile } from "@/features/profiles/queries";
import {
  ArrowUpRight,
  Layers,
  ChevronDown,
  UserRound,
  Presentation,
  LogOut,
} from "lucide-react";
import { NavLinks } from "@/components/nav-links";
import { AccountMenu } from "@/components/account-menu";
import { ThemeSwitcher } from "@/components/theme-switcher";
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
        <NavLinks signedIn={Boolean(user)} />
        <div className="nav-account">
          <ThemeSwitcher />
          {user ? (
            <AccountMenu
              summary={
                <>
                  <Avatar
                    id={user.id}
                    name={profile?.full_name || "Nexus member"}
                    variant={profile?.avatar_variant}
                    path={profile?.avatar_path}
                    size="small"
                  />
                  <span>
                    <small>Your workspace</small>
                    <strong>{profile?.full_name || "Nexus member"}</strong>
                  </span>
                  <ChevronDown size={14} aria-hidden="true" />
                </>
              }
            >
              <Link href="/profile">
                <UserRound size={16} aria-hidden="true" /> My profile
              </Link>
              <Link href="/dashboard/mentor">
                <Presentation size={16} aria-hidden="true" /> Mentor studio
              </Link>
              <form action={signOut}>
                <button type="submit">
                  <LogOut size={16} aria-hidden="true" /> Sign out
                </button>
              </form>
            </AccountMenu>
          ) : (
            <>
              <Link href="/login">Sign in</Link>
              <Link className="button small" href="/signup">
                Join Nexus <ArrowUpRight size={15} />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
