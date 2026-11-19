export const THEME_KEY = "nexus-theme";
export const THEME_EVENT = "nexus-theme-change";
export type ThemePreference = "light" | "dark" | "system";

export function parseTheme(value: unknown): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

let temporaryPreference: ThemePreference | undefined;

export function themePreference(): ThemePreference {
  if (temporaryPreference !== undefined) return temporaryPreference;
  try {
    return parseTheme(window.localStorage.getItem(THEME_KEY));
  } catch {
    return "system";
  }
}

export function applyTheme(preference: ThemePreference) {
  const dark =
    preference === "dark" ||
    (preference === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.dataset.themePreference = preference;
}

export function chooseTheme(preference: ThemePreference) {
  temporaryPreference = preference;
  try {
    window.localStorage.setItem(THEME_KEY, preference);
  } catch {
    /* The choice still works for this tab when storage is blocked. */
  }
  applyTheme(preference);
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function subscribeToTheme(listener: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const update = () => {
    applyTheme(themePreference());
    listener();
  };
  const storage = (event: StorageEvent) => {
    if (event.key === THEME_KEY || event.key === null) {
      temporaryPreference = undefined;
      update();
    }
  };
  window.addEventListener(THEME_EVENT, update);
  window.addEventListener("storage", storage);
  media.addEventListener("change", update);
  update();
  return () => {
    window.removeEventListener(THEME_EVENT, update);
    window.removeEventListener("storage", storage);
    media.removeEventListener("change", update);
  };
}

// Runs in <head> before any page content can paint. No private data is embedded.
export const themeInitScript = `(function(){var p="system";try{var s=localStorage.getItem("${THEME_KEY}");if(s==="light"||s==="dark")p=s;}catch(e){}var d=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";document.documentElement.dataset.themePreference=p;})();`;
