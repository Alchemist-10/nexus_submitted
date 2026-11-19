import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";
import "./workspace.css";
import "./theme.css";

export const metadata: Metadata = {
  title: {
    default: "Nexus — A conversation can change your next step",
    template: "%s · Nexus",
  },
  description:
    "Share where you are stuck, find a mentor for your engineering questions, and work through the approach in a free introductory call.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
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
