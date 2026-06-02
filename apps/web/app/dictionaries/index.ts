import type { ProfileLanguage } from "@ai-stock-advisor/shared";
import { en, type Dictionary } from "./en";
import { ru } from "./ru";
import { uk } from "./uk";

export const dictionaries: Record<ProfileLanguage, Dictionary> = {
  en,
  ru,
  uk,
};

export type { Dictionary };
