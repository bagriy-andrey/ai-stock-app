"use client";

import type { ProfileLanguage } from "@ai-stock-advisor/shared";
import { useId, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import { formatCurrency } from "../../lib/stock-format";

export interface LineChartPoint {
  date: string;
  value: number;
}

interface ResponsiveLineChartProps {
  ariaLabel: string;
  currency: string;
  language: ProfileLanguage;
  points: LineChartPoint[];
}

interface RenderedPoint extends LineChartPoint {
  x: number;
  y: number;
}

const width = 720;
const height = 300;
const padding = {
  top: 18,
  right: 20,
  bottom: 38,
  left: 72,
};

export function ResponsiveLineChart({
  ariaLabel,
  currency,
  language,
  points,
}: ResponsiveLineChartProps) {
  const tooltipId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const rendered = useMemo(() => renderPoints(points), [points]);
  const activePoint = activeIndex === null ? null : rendered.points[activeIndex];
  const linePath = toLinePath(rendered.points);
  const areaPath = toAreaPath(rendered.points, rendered.chartBottom);

  const updateActivePoint = (event: ReactMouseEvent<SVGSVGElement>) => {
    const bounds = svgRef.current?.getBoundingClientRect();

    if (!bounds || rendered.points.length === 0) {
      return;
    }

    const relativeX = ((event.clientX - bounds.left) / bounds.width) * width;
    const nextIndex = rendered.points.reduce(
      (nearestIndex, point, index) => {
        const nearest = rendered.points[nearestIndex];
        return Math.abs(point.x - relativeX) < Math.abs(nearest.x - relativeX)
          ? index
          : nearestIndex;
      },
      0,
    );

    setActiveIndex(nextIndex);
  };

  return (
    <div className="responsive-line-chart">
      <svg
        aria-describedby={activePoint ? tooltipId : undefined}
        aria-label={ariaLabel}
        onBlur={() => setActiveIndex(null)}
        onFocus={() => setActiveIndex(rendered.points.length - 1)}
        onMouseLeave={() => setActiveIndex(null)}
        onMouseMove={updateActivePoint}
        ref={svgRef}
        role="img"
        tabIndex={0}
        viewBox={`0 0 ${width} ${height}`}
      >
        {rendered.yTicks.map((tick) => (
          <g className="responsive-line-chart-grid" key={tick.value}>
            <line x1={padding.left} x2={width - padding.right} y1={tick.y} y2={tick.y} />
            <text x={padding.left - 12} y={tick.y + 4}>
              {formatCompactCurrency(tick.value, currency, language)}
            </text>
          </g>
        ))}
        {rendered.xTicks.map((tick) => (
          <text className="responsive-line-chart-x-label" key={tick.date} x={tick.x} y={height - 12}>
            {formatDate(tick.date, language)}
          </text>
        ))}
        <path className="responsive-line-chart-area" d={areaPath} />
        <path className="responsive-line-chart-line" d={linePath} />
        {activePoint ? (
          <g className="responsive-line-chart-active">
            <line x1={activePoint.x} x2={activePoint.x} y1={padding.top} y2={rendered.chartBottom} />
            <circle cx={activePoint.x} cy={activePoint.y} r="5" />
          </g>
        ) : null}
      </svg>
      {activePoint ? (
        <div
          className="responsive-line-chart-tooltip"
          id={tooltipId}
          style={{
            "--tooltip-x": `${(activePoint.x / width) * 100}%`,
            "--tooltip-y": `${(activePoint.y / height) * 100}%`,
          } as CSSProperties}
        >
          <strong>{formatCurrency(activePoint.value, currency, language)}</strong>
          <span>{formatLongDate(activePoint.date, language)}</span>
        </div>
      ) : null}
    </div>
  );
}

function renderPoints(points: LineChartPoint[]): {
  chartBottom: number;
  points: RenderedPoint[];
  xTicks: Array<{ date: string; x: number }>;
  yTicks: Array<{ value: number; y: number }>;
} {
  const values = points.map((point) => point.value);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const spread = maximum - minimum;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const chartBottom = height - padding.bottom;
  const renderedPoints = points.map((point, index) => {
    const x =
      points.length === 1
        ? padding.left + chartWidth / 2
        : padding.left + (index / (points.length - 1)) * chartWidth;
    const y =
      spread === 0
        ? padding.top + chartHeight / 2
        : padding.top + ((maximum - point.value) / spread) * chartHeight;

    return { ...point, x, y };
  });
  const yTickValues = spread === 0
    ? [minimum]
    : [maximum, minimum + spread / 2, minimum];
  const xTickIndexes = [0, Math.floor((points.length - 1) / 2), points.length - 1]
    .filter((index, position, indexes) => index >= 0 && indexes.indexOf(index) === position);

  return {
    chartBottom,
    points: renderedPoints,
    xTicks: xTickIndexes.map((index) => ({
      date: points[index].date,
      x: renderedPoints[index].x,
    })),
    yTicks: yTickValues.map((value) => ({
      value,
      y:
        spread === 0
          ? padding.top + chartHeight / 2
          : padding.top + ((maximum - value) / spread) * chartHeight,
    })),
  };
}

function toLinePath(points: RenderedPoint[]): string {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function toAreaPath(points: RenderedPoint[], chartBottom: number): string {
  if (points.length === 0) {
    return "";
  }

  return `${toLinePath(points)} L ${points[points.length - 1].x} ${chartBottom} L ${points[0].x} ${chartBottom} Z`;
}

function formatCompactCurrency(
  value: number,
  currency: string,
  language: ProfileLanguage,
): string {
  return new Intl.NumberFormat(language, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(date: string, language: ProfileLanguage): string {
  return new Intl.DateTimeFormat(language, {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function formatLongDate(date: string, language: ProfileLanguage): string {
  return new Intl.DateTimeFormat(language, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00.000Z`));
}
