"use client";

import type { ProfileTheme, UserDto } from "@ai-stock-advisor/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProfile } from "../../lib/profile-api";
import { useAuth } from "../auth/AuthProvider";
import { useI18n } from "../i18n/I18nProvider";
import { ThemeIcon } from "../layout/HeaderIcons";

interface HeaderThemeSelectorProps {
  isOpen: boolean;
  onToggle: () => void;
}

const themes: readonly ProfileTheme[] = ["light", "dark", "system"];

export function HeaderThemeSelector({
  isOpen,
  onToggle,
}: HeaderThemeSelectorProps) {
  const queryClient = useQueryClient();
  const { accessToken, updateUser, user } = useAuth();
  const { t } = useI18n();
  const theme = user?.theme ?? "system";
  const mutation = useMutation({
    mutationFn: (nextTheme: ProfileTheme) =>
      updateProfile(accessToken ?? "", { theme: nextTheme }),
    onSuccess: (profile) => {
      queryClient.setQueryData<UserDto>(["profile"], profile);
      updateUser(profile);
      onToggle();
    },
  });

  return (
    <div className="header-control">
      <button
        className="header-icon-button"
        type="button"
        aria-label={t.themePreference}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={onToggle}
        disabled={mutation.isPending || !user}
      >
        <ThemeIcon className="header-action-icon" theme={theme} />
      </button>
      {isOpen ? (
        <div className="header-popover header-theme-menu" role="menu">
          {themes.map((option) => (
            <button
              className="header-popover-option"
              key={option}
              type="button"
              role="menuitemradio"
              aria-checked={option === theme}
              aria-label={t[option]}
              title={t[option]}
              onClick={() => mutation.mutate(option)}
              disabled={mutation.isPending}
            >
              <ThemeIcon className="header-action-icon" theme={option} />
              <span>{t[option]}</span>
            </button>
          ))}
          {mutation.isError ? (
            <p className="error-text header-popover-error">{t.profileSaveError}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
