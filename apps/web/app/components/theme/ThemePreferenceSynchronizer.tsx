"use client";

import type { ProfileTheme } from "@ai-stock-advisor/shared";
import { useEffect } from "react";
import { useAuth } from "../auth/AuthProvider";

function applyTheme(theme: ProfileTheme): void {
  const resolvedTheme =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;

  document.documentElement.dataset.theme = resolvedTheme;
}

export function ThemePreferenceSynchronizer() {
  const { user } = useAuth();
  const theme = user?.theme ?? "system";

  useEffect(() => {
    applyTheme(theme);
    const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
    const onColorSchemeChange = () => applyTheme(theme);

    colorScheme.addEventListener("change", onColorSchemeChange);
    return () => colorScheme.removeEventListener("change", onColorSchemeChange);
  }, [theme]);

  return null;
}
