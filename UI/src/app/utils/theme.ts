export type ThemeMode = "light" | "dark" | "system";

const THEME_KEY = "themeMode";

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

function getSystemPreference() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getSavedThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  const rawValue = window.localStorage.getItem(THEME_KEY);
  return isThemeMode(rawValue) ? rawValue : "light";
}

export function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") {
    return;
  }

  const resolved = mode === "system" ? getSystemPreference() : mode;
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export function saveTheme(mode: ThemeMode) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(THEME_KEY, mode);
  applyTheme(mode);
}

