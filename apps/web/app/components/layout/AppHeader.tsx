"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useI18n } from "../i18n/I18nProvider";
import { HeaderLanguageSelector } from "../i18n/LanguageSelector";
import { Avatar } from "../ui/avatar";
import { resolveAvatarUrl } from "../../lib/profile-api";
import { getUserInitials } from "../../lib/profile-display";
import { HeaderThemeSelector } from "../theme/HeaderThemeSelector";
import {
  HomeIcon,
  MenuIcon,
  PortfolioIcon,
  SignOutIcon,
  TransactionsIcon,
  WatchlistIcon,
} from "./HeaderIcons";

type OpenMenu = "language" | "theme" | "navigation" | null;

export function AppHeader() {
  const { logout, user } = useAuth();
  const { t } = useI18n();
  const pathname = usePathname();
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
        const focusedControl =
          document.activeElement instanceof HTMLElement
            ? document.activeElement.closest<HTMLElement>(".header-control")
            : null;

        event.preventDefault();
        setOpenMenu(null);
        focusedControl
          ?.querySelector<HTMLButtonElement>(".header-icon-button")
          ?.focus();
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

  const getActivePage = (href: string) =>
    pathname === href ? "page" : undefined;
  const avatarAlt = user.nickname ?? user.name ?? user.email ?? t.profile;

  return (
    <header className="app-header" ref={headerRef}>
      <nav className="top-nav" aria-label={t.navLabel}>
        <Link
          aria-label={`AI Stock Advisor: ${t.homePage}`}
          className="app-brand"
          href="/"
        >
          <span aria-hidden="true" className="app-brand-mark">
            A
          </span>
          <span className="app-brand-copy">
            <strong>AI Stock Advisor</strong>
            <small>{t.homePage}</small>
          </span>
        </Link>
        <div className="header-actions">
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
              alt={avatarAlt}
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
              onClick={() => toggleMenu("navigation")}
            >
              <MenuIcon className="header-action-icon" />
            </button>
            {openMenu === "navigation" ? (
              <div className="header-popover header-navigation-menu">
                <Link
                  aria-current={getActivePage("/")}
                  href="/"
                  onClick={() => setOpenMenu(null)}
                >
                  <HomeIcon className="header-menu-icon" />
                  <span>{t.homePage}</span>
                </Link>
                <Link
                  aria-current={getActivePage("/portfolio")}
                  href="/portfolio"
                  onClick={() => setOpenMenu(null)}
                >
                  <PortfolioIcon className="header-menu-icon" />
                  <span>{t.portfolio}</span>
                </Link>
                <Link
                  aria-current={getActivePage("/transactions")}
                  href="/transactions"
                  onClick={() => setOpenMenu(null)}
                >
                  <TransactionsIcon className="header-menu-icon" />
                  <span>{t.transactions}</span>
                </Link>
                <Link
                  aria-current={getActivePage("/watchlist")}
                  href="/watchlist"
                  onClick={() => setOpenMenu(null)}
                >
                  <WatchlistIcon className="header-menu-icon" />
                  <span>{t.watchlist}</span>
                </Link>
                <button
                  className="header-sign-out"
                  type="button"
                  onClick={logout}
                >
                  <SignOutIcon className="header-menu-icon" />
                  <span>{t.signOut}</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </nav>
    </header>
  );
}
