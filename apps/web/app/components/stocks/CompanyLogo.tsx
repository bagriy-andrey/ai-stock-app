"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

interface CompanyLogoAvatarProps {
  className?: string;
  companyName: string;
  logoUrl?: string;
  ticker: string;
}

type LogoRenderMode = "compact-source" | "padded-source";

const logoScaleByTicker: Record<string, number> = {
  AMZN: 1.24,
  GRMN: 1.65,
  IBM: 1.34,
  NVDA: 1.18,
  QCOM: 1.34,
};

export function CompanyLogoAvatar({
  className = "",
  companyName,
  logoUrl,
  ticker,
}: CompanyLogoAvatarProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const [renderMode, setRenderMode] =
    useState<LogoRenderMode>("padded-source");
  const normalizedTicker = ticker.trim().toUpperCase();
  const logoScale =
    renderMode === "compact-source"
      ? logoScaleByTicker[normalizedTicker] ?? 1.12
      : 1;
  const logoFit = renderMode === "compact-source" ? "cover" : "contain";
  const logoPadding = renderMode === "compact-source" ? "0px" : "7px";

  useEffect(() => {
    setHasImageError(false);
    setRenderMode("padded-source");
  }, [logoUrl]);

  return (
    <div
      className={`company-logo ${className}`.trim()}
      style={
        {
          "--company-logo-image-fit": logoFit,
          "--company-logo-image-scale": logoScale,
          "--company-logo-padding": logoPadding,
        } as CSSProperties
      }
      aria-hidden="true"
    >
      {logoUrl && !hasImageError ? (
        // Finnhub returns dynamic third-party image URLs, so a native image is intentional.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          decoding="async"
          onLoad={(event) => {
            const { naturalHeight, naturalWidth } = event.currentTarget;
            const smallestSide = Math.min(naturalWidth, naturalHeight);

            setRenderMode(
              smallestSide > 0 && smallestSide <= 128
                ? "compact-source"
                : "padded-source",
            );
          }}
          onError={() => setHasImageError(true)}
          referrerPolicy="no-referrer"
          src={logoUrl}
        />
      ) : (
        <span>{getTickerInitials(normalizedTicker, companyName)}</span>
      )}
    </div>
  );
}

export function CompanyLogo(props: CompanyLogoAvatarProps) {
  return <CompanyLogoAvatar {...props} />;
}

function getTickerInitials(ticker: string, companyName: string): string {
  return (ticker || companyName.slice(0, 2)).slice(0, 2).toUpperCase();
}
