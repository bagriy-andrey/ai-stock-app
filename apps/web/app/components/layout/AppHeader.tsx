"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useI18n } from "../i18n/I18nProvider";
import { HeaderLanguageSelector } from "../i18n/LanguageSelector";
import { Avatar } from "../ui/avatar";
import { resolveAvatarUrl } from "../../lib/profile-api";
import { getUserInitials } from "../../lib/profile-display";
import { HeaderThemeSelector } from "../theme/HeaderThemeSelector";
import {
  DashboardIcon,
  HomeIcon,
  MenuIcon,
  SignOutIcon,
  WatchlistIcon,
} from "./HeaderIcons";

type OpenMenu = "language" | "theme" | "navigation" | null;

export function AppHeader() {
  const { logout, user } = useAuth();
  const { t } = useI18n();
  const headerRef = useRef<HTMLElement>(null);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);

  useEffect(() => {
    const closeMenu = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    const closeMenuOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }
    };

    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeMenuOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeMenuOnEscape);
    };
  }, []);

  if (!user) {
    return null;
  }

  const toggleMenu = (menu: Exclude<OpenMenu, null>) => {
    setOpenMenu((current) => current === menu ? null : menu);
  };

  return (
    <header className="app-header" ref={headerRef}>
      <nav className="top-nav" aria-label={t.navLabel}>
        <HeaderLanguageSelector
          isOpen={openMenu === "language"}
          onToggle={() => toggleMenu("language")}
        />
        <HeaderThemeSelector
          isOpen={openMenu === "theme"}
          onToggle={() => toggleMenu("theme")}
        />
        <Link className="header-profile-link" href="/profile" aria-label={t.profile}>
          <Avatar
            alt={user.nickname ?? user.name}
            className="header-avatar"
            fallback={getUserInitials(user)}
            src={resolveAvatarUrl(user.avatarUrl)}
          />
        </Link>
        <div className="header-control">
          <button
            className="header-icon-button"
            type="button"
            aria-label={t.navLabel}
            aria-expanded={openMenu === "navigation"}
            aria-haspopup="menu"
            onClick={() => toggleMenu("navigation")}
          >
            <MenuIcon className="header-action-icon" />
          </button>
          {openMenu === "navigation" ? (
            <div className="header-popover header-navigation-menu" role="menu">
              <Link
                href="/dashboard"
                role="menuitem"
                onClick={() => setOpenMenu(null)}
              >
                <DashboardIcon className="header-menu-icon" />
                <span>{t.dashboard}</span>
              </Link>
              <Link
                href="/watchlist"
                role="menuitem"
                onClick={() => setOpenMenu(null)}
              >
                <WatchlistIcon className="header-menu-icon" />
                <span>{t.watchlist}</span>
              </Link>
              <Link href="/" role="menuitem" onClick={() => setOpenMenu(null)}>
                <HomeIcon className="header-menu-icon" />
                <span>{t.homePage}</span>
              </Link>
              <button
                className="header-sign-out"
                type="button"
                role="menuitem"
                onClick={logout}
              >
                <SignOutIcon className="header-menu-icon" />
                <span>{t.signOut}</span>
              </button>
            </div>
          ) : null}
        </div>
      </nav>
    </header>
  );
}
