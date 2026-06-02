"use client";

import type { ProfileLanguage } from "@ai-stock-advisor/shared";
import { createContext, useContext, useEffect, useMemo } from "react";
import { dictionaries, type Dictionary } from "../../dictionaries";
import { normalizeProfileLanguage } from "../../lib/profile-language";
import { useAuth } from "../auth/AuthProvider";

interface I18nContextValue {
  language: ProfileLanguage;
  t: Dictionary;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user } = useAuth();
  const language = normalizeProfileLanguage(user?.language);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      t: dictionaries[language],
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);

  if (!value) {
    throw new Error("useI18n must be used inside I18nProvider");
  }

  return value;
}
