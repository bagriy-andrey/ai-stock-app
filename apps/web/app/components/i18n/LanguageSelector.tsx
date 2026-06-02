"use client";

import type { ProfileLanguage, UserDto } from "@ai-stock-advisor/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { Select } from "../ui/select";
import { updateProfile } from "../../lib/profile-api";
import { profileLanguages } from "../../lib/profile-language";
import { useI18n } from "./I18nProvider";

interface LanguageSelectorProps {
  id: string;
  disabled?: boolean;
  showLabel?: boolean;
}

interface HeaderLanguageSelectorProps {
  isOpen: boolean;
  onToggle: () => void;
}

const languageNames: Record<ProfileLanguage, string> = {
  en: "English",
  ru: "Русский",
  uk: "Українська",
};

const languageFlags: Record<ProfileLanguage, string> = {
  en: "🇬🇧",
  ru: "🇷🇺",
  uk: "🇺🇦",
};

export function LanguageSelector({
  id,
  disabled = false,
  showLabel = false,
}: LanguageSelectorProps) {
  const queryClient = useQueryClient();
  const { accessToken, updateUser, user } = useAuth();
  const { language, t } = useI18n();
  const mutation = useMutation({
    mutationFn: (nextLanguage: ProfileLanguage) =>
      updateProfile(accessToken ?? "", { language: nextLanguage }),
    onSuccess: (profile) => {
      queryClient.setQueryData<UserDto>(["profile"], profile);
      updateUser(profile);
    },
  });

  return (
    <div className="language-selector">
      <label className={showLabel ? undefined : "visually-hidden"} htmlFor={id}>
        {showLabel ? t.preferredLanguage : t.language}
      </label>
      <Select
        id={id}
        value={language}
        onChange={(event) => mutation.mutate(event.target.value as ProfileLanguage)}
        disabled={disabled || mutation.isPending || !user}
      >
        {profileLanguages.map((option) => (
          <option key={option} value={option}>
            {languageNames[option]}
          </option>
        ))}
      </Select>
      {mutation.isError ? (
        <p className="error-text language-selector-error">{t.languageUpdateError}</p>
      ) : null}
    </div>
  );
}

export function HeaderLanguageSelector({
  isOpen,
  onToggle,
}: HeaderLanguageSelectorProps) {
  const queryClient = useQueryClient();
  const { accessToken, updateUser, user } = useAuth();
  const { language, t } = useI18n();
  const mutation = useMutation({
    mutationFn: (nextLanguage: ProfileLanguage) =>
      updateProfile(accessToken ?? "", { language: nextLanguage }),
    onSuccess: (profile) => {
      queryClient.setQueryData<UserDto>(["profile"], profile);
      updateUser(profile);
      onToggle();
    },
  });

  return (
    <div className="header-control">
      <button
        className="header-icon-button header-language-button"
        type="button"
        aria-label={t.language}
        aria-expanded={isOpen}
        onClick={onToggle}
        disabled={mutation.isPending || !user}
      >
        <span className="header-flag" aria-hidden="true">
          {languageFlags[language]}
        </span>
      </button>
      {isOpen ? (
        <div className="header-popover header-language-menu">
          {profileLanguages.map((option) => (
            <button
              className="header-popover-option"
              key={option}
              type="button"
              aria-pressed={option === language}
              onClick={() => mutation.mutate(option)}
              disabled={mutation.isPending}
            >
              <span className="header-flag" aria-hidden="true">
                {languageFlags[option]}
              </span>
              <span>{languageNames[option]}</span>
            </button>
          ))}
          {mutation.isError ? (
            <p className="error-text header-popover-error">{t.languageUpdateError}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
