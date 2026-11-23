import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import { themeInitScript } from "@/lib/theme";
import { ConnectionMark } from "@/components/connection-mark";
import "./globals.css";
import "./workspace.css";
import "./theme.css";
import "./notifications.css";

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
          <span className="brand">
            <span className="brand-mark">
              <ConnectionMark />
            </span>
            nexus.
          </span>
          <p>A question. A person. A next step.</p>
          <span className="footer-colophon">
            THE LEARNING STUDIO / ENGINEERING STUDENTS
          </span>
        </footer>
      </body>
    </html>
  );
}
