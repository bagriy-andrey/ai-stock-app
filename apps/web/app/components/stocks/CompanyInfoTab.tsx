"use client";

import type { ProfileLanguage, StockDetails } from "@ai-stock-advisor/shared";
import type { ReactNode } from "react";
import type { Dictionary } from "../../dictionaries";
import {
  formatOptionalInteger,
  formatOptionalText,
} from "./stock-details-utils";

interface CompanyInfoTabProps {
  details: StockDetails;
  language: ProfileLanguage;
  t: Dictionary;
}

export function CompanyInfoTab({ details, language, t }: CompanyInfoTabProps) {
  const fundamentals = details.fundamentals ?? {};

  return (
    <section aria-label={t.companyInfoTab} className="company-info-tab">
      <CompanyInfoSection title={t.basicInformation}>
        <CompanyInfoItem label={t.companyName} value={formatOptionalText(details.name)} />
        <CompanyInfoItem label={t.ticker} value={formatOptionalText(details.symbol)} />
        <CompanyInfoItem
          label={t.sector}
          value={formatOptionalText(fundamentals.sector)}
        />
        <CompanyInfoItem
          label={t.industry}
          value={formatOptionalText(fundamentals.industry)}
        />
        <CompanyInfoItem label={t.country} value={formatOptionalText(details.country)} />
      </CompanyInfoSection>
      <CompanyInfoSection title={t.companyProfile}>
        <CompanyInfoItem
          className="company-info-item-wide"
          label={t.description}
          value={formatOptionalText(details.description)}
        />
        <CompanyWebsiteItem label={t.website} website={details.website} />
        <CompanyInfoItem label={t.ceo} value={formatOptionalText(details.ceo)} />
        <CompanyInfoItem
          label={t.headquarters}
          value={formatOptionalText(details.headquarters)}
        />
        <CompanyInfoItem
          label={t.employees}
          value={formatOptionalInteger(details.employees, language)}
        />
        <CompanyInfoItem
          label={t.foundedYear}
          value={formatOptionalInteger(details.foundedYear, language)}
        />
      </CompanyInfoSection>
    </section>
  );
}

interface CompanyInfoSectionProps {
  children: ReactNode;
  title: string;
}

function CompanyInfoSection({ children, title }: CompanyInfoSectionProps) {
  return (
    <section className="company-info-section">
      <h3>{title}</h3>
      <dl className="company-info-grid">{children}</dl>
    </section>
  );
}

interface CompanyInfoItemProps {
  className?: string;
  label: string;
  value: string;
}

function CompanyInfoItem({
  className = "",
  label,
  value,
}: CompanyInfoItemProps) {
  return (
    <div className={["company-info-item", className].filter(Boolean).join(" ")}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

interface CompanyWebsiteItemProps {
  label: string;
  website?: string;
}

function CompanyWebsiteItem({ label, website }: CompanyWebsiteItemProps) {
  const normalizedWebsite = website?.trim();

  return (
    <div className="company-info-item">
      <dt>{label}</dt>
      <dd>
        {normalizedWebsite ? (
          <a href={normalizedWebsite} rel="noreferrer" target="_blank">
            {normalizedWebsite}
          </a>
        ) : (
          "N/A"
        )}
      </dd>
    </div>
  );
}
