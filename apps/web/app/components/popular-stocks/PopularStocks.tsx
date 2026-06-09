"use client";

import type { CompanyProfile } from "@ai-stock-advisor/shared";
import { useQueries } from "@tanstack/react-query";
import type { Dictionary } from "../../dictionaries";
import { fetchCompanyProfile } from "../../lib/market-data-api";
import { PopularStockCard } from "./PopularStockCard";
import { popularStockTickers } from "./popularStocks.constants";

interface PopularStocksProps {
  accessToken?: string;
  onOpenStock: (stock: {
    companyName?: string;
    logoUrl?: string;
    ticker: string;
  }) => void;
  t: Dictionary;
}

export function PopularStocks({
  accessToken,
  onOpenStock,
  t,
}: PopularStocksProps) {
  const profileQueries = useQueries({
    queries: popularStockTickers.map((ticker) => ({
      queryKey: ["market-data", "company", ticker],
      queryFn: () => fetchCompanyProfile(accessToken ?? "", ticker),
      enabled: Boolean(accessToken),
      staleTime: 24 * 60 * 60 * 1_000,
      retry: false,
    })),
  });

  return (
    <div className="popular-stocks-grid">
      {popularStockTickers.map((ticker, index) => {
        const query = profileQueries[index];
        const profile = query?.data as CompanyProfile | undefined;

        return (
          <PopularStockCard
            companyUnavailableLabel={t.companyUnavailable}
            isLoading={query?.isLoading ?? false}
            key={ticker}
            onOpen={onOpenStock}
            profile={profile}
            ticker={ticker}
          />
        );
      })}
    </div>
  );
}
