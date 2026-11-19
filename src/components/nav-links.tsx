"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Compass, MessagesSquare } from "lucide-react";

export function NavLinks({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const links = [
    {
      href: "/",
      label: "Community",
      icon: MessagesSquare,
      active: pathname === "/" || pathname.startsWith("/posts"),
    },
    {
      href: "/mentors",
      label: "Find a mentor",
      icon: Compass,
      active: pathname.startsWith("/mentors"),
    },
    ...(signedIn
      ? [
          {
            href: "/dashboard",
            label: "My sessions",
            icon: CalendarDays,
            active:
              pathname === "/dashboard" ||
              pathname.startsWith("/bookings") ||
              pathname.startsWith("/checkout"),
          },
        ]
      : []),
  ];
  return (
    <nav className="workspace-nav" aria-label="Main navigation">
      {links.map(({ href, label, icon: Icon, active }) => (
        <Link key={href} href={href} aria-current={active ? "page" : undefined}>
          <Icon size={17} aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
