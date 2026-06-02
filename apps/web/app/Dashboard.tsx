"use client";

import { AppHeader } from "./components/layout/AppHeader";
import { useI18n } from "./components/i18n/I18nProvider";
import { EmptyState } from "./components/ui/EmptyState";

export function Dashboard() {
  const { t } = useI18n();

  return (
    <main>
      <AppHeader />

      <header className="page-header">
        <p className="eyebrow">{t.dashboardEyebrow}</p>
        <h1>AI Stock Advisor</h1>
        <p className="subtitle">{t.dashboardSubtitle}</p>
      </header>

      <section aria-labelledby="watchlist-heading" className="page-section">
        <h2 id="watchlist-heading">{t.dashboardWatchlist}</h2>
        <EmptyState
          actionHref="/watchlist"
          actionLabel={t.openWatchlist}
          description={t.dashboardEmpty}
          title={t.dashboardEmptyTitle}
        />
      </section>
    </main>
  );
}
