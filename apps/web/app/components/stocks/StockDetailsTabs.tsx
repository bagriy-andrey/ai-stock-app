"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/tabs";
import type { ReactNode } from "react";
import type { Dictionary } from "../../dictionaries";
import type { StockDetailsTabValue } from "./stock-details-types";

interface StockDetailsTabsProps {
  chartContent: ReactNode;
  companyInfoContent: ReactNode;
  stockInfoContent: ReactNode;
  t: Dictionary;
  value: StockDetailsTabValue;
  onValueChange: (value: StockDetailsTabValue) => void;
}

export function StockDetailsTabs({
  chartContent,
  companyInfoContent,
  stockInfoContent,
  t,
  value,
  onValueChange,
}: StockDetailsTabsProps) {
  return (
    <Tabs
      className="stock-details-tabs"
      onValueChange={(nextValue) =>
        onValueChange(nextValue as StockDetailsTabValue)
      }
      value={value}
    >
      <TabsList
        aria-label={t.stockDetailsTabs}
        className="stock-details-tabs-list"
      >
        <TabsTrigger value="chart">{t.chartTab}</TabsTrigger>
        <TabsTrigger value="stock-info">{t.stockInfoTab}</TabsTrigger>
        <TabsTrigger value="company-info">{t.companyInfoTab}</TabsTrigger>
      </TabsList>
      <div className="stock-details-tabs-content">
        <TabsContent value="chart">{chartContent}</TabsContent>
        <TabsContent value="stock-info">{stockInfoContent}</TabsContent>
        <TabsContent value="company-info">{companyInfoContent}</TabsContent>
      </div>
    </Tabs>
  );
}
