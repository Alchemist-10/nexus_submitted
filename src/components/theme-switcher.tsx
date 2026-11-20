"use client";

import { useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";
import { chooseTheme, subscribeToTheme } from "@/lib/theme";

const serverDark = () => false;
const isDark = () => document.documentElement.dataset.theme === "dark";

export function ThemeSwitcher() {
  const dark = useSyncExternalStore(subscribeToTheme, isDark, serverDark);
  return (
    <button
      className="theme-toggle"
      type="button"
      aria-label="Dark mode"
      aria-pressed={dark}
      title={`Switch to ${dark ? "light" : "dark"} mode`}
      onClick={() => chooseTheme(isDark() ? "light" : "dark")}
    >
      <Moon className="theme-moon" size={18} aria-hidden="true" />
      <Sun className="theme-sun" size={18} aria-hidden="true" />
    </button>
  );
}
