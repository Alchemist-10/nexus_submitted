import assert from "node:assert/strict";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import {
  chooseTheme,
  parseTheme,
  subscribeToTheme,
  themeInitScript,
  themePreference,
  THEME_KEY,
} from "../src/lib/theme";

function firstPaint(saved: unknown, prefersDark: boolean, blocked = false) {
  const dataset: Record<string, string> = {};
  runInNewContext(themeInitScript, {
    localStorage: {
      getItem() {
        if (blocked) throw new Error("Storage blocked");
        return saved;
      },
    },
    window: { matchMedia: () => ({ matches: prefersDark }) },
    document: { documentElement: { dataset } },
  });
  return dataset;
}
test("first paint respects saved choices before page content is rendered", () => {
  assert.deepEqual(firstPaint("dark", false), {
    theme: "dark",
    themePreference: "dark",
  });
  assert.deepEqual(firstPaint("light", true), {
    theme: "light",
    themePreference: "light",
  });
});
test("first visit, invalid preferences, and blocked storage follow the OS", () => {
  for (const saved of [null, "system", "invalid", "<script>"]) {
    assert.equal(firstPaint(saved, true).theme, "dark");
    assert.equal(firstPaint(saved, false).theme, "light");
  }
  assert.equal(firstPaint(null, true, true).theme, "dark");
  assert.equal(firstPaint(null, false, true).theme, "light");
  assert.equal(parseTheme("DARK"), "system");
});

test("runtime selection follows system changes, syncs tabs, and survives write-blocked storage", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalDocument = Object.getOwnPropertyDescriptor(
    globalThis,
    "document",
  );
  const dataset: Record<string, string> = {};
  let saved: string | null = null;
  let blocked = false;
  const media = Object.assign(new EventTarget(), { matches: false });
  const browser = Object.assign(new EventTarget(), {
    matchMedia: () => media,
    localStorage: {
      getItem: () => saved,
      setItem: (_key: string, value: string) => {
        if (blocked) throw new Error("Storage quota");
        saved = value;
      },
    },
  });
  Object.defineProperty(globalThis, "window", {
    value: browser,
    configurable: true,
  });
  Object.defineProperty(globalThis, "document", {
    value: { documentElement: { dataset } },
    configurable: true,
  });
  let unsubscribe = () => {};
  try {
    unsubscribe = subscribeToTheme(() => {});
    assert.equal(dataset.theme, "light");
    chooseTheme("dark");
    assert.equal(dataset.theme, "dark");
    assert.equal(saved, "dark");
    chooseTheme("light");
    media.matches = true;
    media.dispatchEvent(new Event("change"));
    assert.equal(dataset.theme, "light");
    chooseTheme("system");
    assert.equal(dataset.theme, "dark");
    media.matches = false;
    media.dispatchEvent(new Event("change"));
    assert.equal(dataset.theme, "light");
    saved = "dark";
    browser.dispatchEvent(
      Object.assign(new Event("storage"), { key: THEME_KEY }),
    );
    assert.equal(dataset.theme, "dark");
    saved = "light";
    browser.dispatchEvent(
      Object.assign(new Event("storage"), { key: THEME_KEY }),
    );
    blocked = true;
    chooseTheme("dark");
    assert.equal(saved, "light");
    assert.equal(themePreference(), "dark");
    assert.equal(dataset.theme, "dark");
  } finally {
    unsubscribe();
    if (originalWindow)
      Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (originalDocument)
      Object.defineProperty(globalThis, "document", originalDocument);
    else Reflect.deleteProperty(globalThis, "document");
  }
});
