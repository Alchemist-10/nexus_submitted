"use client";

import { useSyncExternalStore } from "react";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { AccountMenu } from "@/components/account-menu";
import { chooseTheme, themePreference, subscribeToTheme } from "@/lib/theme";

const serverPreference = () => "system" as const;
const choices = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
] as const;

export function ThemeSwitcher() {
  const preference = useSyncExternalStore(
    subscribeToTheme,
    themePreference,
    serverPreference,
  );
  return (
    <AccountMenu
      className="theme-menu"
      label="Choose colour theme"
      summary={
        <>
          <Sun className="theme-sun" size={18} aria-hidden="true" />
          <Moon className="theme-moon" size={18} aria-hidden="true" />
        </>
      }
    >
      <span className="theme-menu-label">APPEARANCE</span>
      <div role="group" aria-label="Colour theme">
        {choices.map(({ id, label, icon: Icon }) => (
          <button
            type="button"
            key={id}
            aria-pressed={preference === id}
            onClick={(event) => {
              chooseTheme(id);
              const menu = event.currentTarget.closest("details");
              if (menu) {
                menu.open = false;
                menu.querySelector("summary")?.focus();
              }
            }}
          >
            <Icon size={16} aria-hidden="true" />
            <span>{label}</span>
            {preference === id && (
              <Check size={15} className="theme-selected" aria-hidden="true" />
            )}
          </button>
        ))}
      </div>
      <p className="theme-menu-note">System follows your device.</p>
    </AccountMenu>
  );
}
