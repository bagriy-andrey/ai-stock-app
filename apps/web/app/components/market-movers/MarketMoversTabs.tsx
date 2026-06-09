"use client";

import type { ReactNode } from "react";
import type { Dictionary } from "../../dictionaries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

export type MarketMoversTabValue = "gainers" | "losers";

interface MarketMoversTabsProps {
  activeTab: MarketMoversTabValue;
  children: ReactNode;
  onTabChange: (value: MarketMoversTabValue) => void;
  t: Dictionary;
}

export function MarketMoversTabs({
  activeTab,
  children,
  onTabChange,
  t,
}: MarketMoversTabsProps) {
  return (
    <Tabs
      className="market-movers-tabs"
      onValueChange={(value) => onTabChange(value as MarketMoversTabValue)}
      value={activeTab}
    >
      <TabsList
        aria-label="Market movers lists"
        className="market-movers-tabs-list"
      >
        <TabsTrigger className="market-movers-tabs-trigger" value="gainers">
          {t.topGainers}
        </TabsTrigger>
        <TabsTrigger className="market-movers-tabs-trigger" value="losers">
          {t.topLosers}
        </TabsTrigger>
      </TabsList>
      <TabsContent
        className="market-movers-tabs-content"
        key={activeTab}
        value={activeTab}
      >
        {children}
      </TabsContent>
    </Tabs>
  );
}
