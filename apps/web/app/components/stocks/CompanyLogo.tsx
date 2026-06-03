"use client";

import { useEffect, useState } from "react";

interface CompanyLogoProps {
  className?: string;
  companyName: string;
  logoUrl?: string;
  ticker: string;
}

export function CompanyLogo({
  className = "",
  companyName,
  logoUrl,
  ticker,
}: CompanyLogoProps) {
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [logoUrl]);

  return (
    <div className={`company-logo ${className}`.trim()} aria-hidden="true">
      {logoUrl && !hasImageError ? (
        // Finnhub returns dynamic third-party image URLs, so a native image is intentional.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          decoding="async"
          onError={() => setHasImageError(true)}
          referrerPolicy="no-referrer"
          src={logoUrl}
        />
      ) : (
        <span>{getInitials(companyName, ticker)}</span>
      )}
    </div>
  );
}

function getInitials(companyName: string, ticker: string): string {
  const initials = companyName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (initials || ticker.slice(0, 2)).toUpperCase();
}
