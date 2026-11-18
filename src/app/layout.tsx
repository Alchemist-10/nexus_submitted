import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Nexus — A conversation can change your next step",
    template: "%s · Nexus",
  },
  description:
    "Find a mentor, share what you know, and start with a free introductory conversation.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Navigation />
        <main id="main">{children}</main>
        <footer className="shell site-footer">
          <span className="brand">nexus.</span>
          <p>Good people. Shared knowledge. Your next step.</p>
          <span>Built for connection.</span>
        </footer>
      </body>
    </html>
  );
}
