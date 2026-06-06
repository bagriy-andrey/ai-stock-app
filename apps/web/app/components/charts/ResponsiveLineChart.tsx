"use client";

import type { ProfileLanguage } from "@ai-stock-advisor/shared";
import { useId, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import { formatCurrency } from "../../lib/stock-format";

export interface LineChartPoint {
  date: string;
  value: number;
}

export interface LineChartSeries {
  id: string;
  label: string;
  points: LineChartPoint[];
  variant?: "primary" | "secondary";
}

export interface LineChartTooltipItem {
  label: string;
  value: string;
  variant?: "positive" | "negative" | "neutral";
}

export interface LineChartTooltipPoint {
  date: string;
  values: Record<string, number>;
}

interface ResponsiveLineChartProps {
  ariaLabel: string;
  currency: string;
  language: ProfileLanguage;
  points?: LineChartPoint[];
  series?: LineChartSeries[];
  tooltipItems?: (point: LineChartTooltipPoint) => LineChartTooltipItem[];
}

interface RenderedPoint extends LineChartPoint {
  x: number;
  y: number;
}

interface RenderedSeries {
  id: string;
  label: string;
  path: string;
  points: RenderedPoint[];
  variant: "primary" | "secondary";
}

interface ActiveDatePoint {
  date: string;
  x: number;
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
  points = [],
  series,
  tooltipItems,
}: ResponsiveLineChartProps) {
  const tooltipId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const chartSeries = useMemo(
    () =>
      series ?? [
        {
          id: "value",
          label: ariaLabel,
          points,
          variant: "primary" as const,
        },
      ],
    [ariaLabel, points, series],
  );
  const rendered = useMemo(() => renderSeries(chartSeries), [chartSeries]);
  const activeDate =
    activeIndex === null ? null : rendered.activeDates[activeIndex];
  const activeTooltipPoint = activeDate
    ? toTooltipPoint(activeDate.date, rendered.series)
    : null;
  const activePrimaryPoint = activeDate
    ? rendered.series[0]?.points.find((point) => point.date === activeDate.date) ??
      null
    : null;
  const activeTooltipItems = activeTooltipPoint
    ? tooltipItems
      ? tooltipItems(activeTooltipPoint)
      : toDefaultTooltipItems(activeTooltipPoint, chartSeries, currency, language)
    : [];
  const primaryAreaPath = toAreaPath(
    rendered.series[0]?.points ?? [],
    rendered.chartBottom,
  );

  const updateActivePoint = (event: ReactMouseEvent<SVGSVGElement>) => {
    const bounds = svgRef.current?.getBoundingClientRect();

    if (!bounds || rendered.activeDates.length === 0) {
      return;
    }

    const relativeX = ((event.clientX - bounds.left) / bounds.width) * width;
    const nextIndex = rendered.activeDates.reduce(
      (nearestIndex, point, index) => {
        const nearest = rendered.activeDates[nearestIndex];
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
        aria-describedby={activeDate ? tooltipId : undefined}
        aria-label={ariaLabel}
        onBlur={() => setActiveIndex(null)}
        onFocus={() => setActiveIndex(rendered.activeDates.length - 1)}
        onMouseLeave={() => setActiveIndex(null)}
        onMouseMove={updateActivePoint}
        ref={svgRef}
        role="img"
        tabIndex={0}
        viewBox={`0 0 ${width} ${height}`}
      >
        {rendered.yTicks.map((tick) => (
          <g className="responsive-line-chart-grid" key={tick.value}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={tick.y}
              y2={tick.y}
            />
            <text x={padding.left - 12} y={tick.y + 4}>
              {formatCompactCurrency(tick.value, currency, language)}
            </text>
          </g>
        ))}
        {rendered.xTicks.map((tick) => (
          <text
            className="responsive-line-chart-x-label"
            key={tick.date}
            x={tick.x}
            y={height - 12}
          >
            {formatDate(tick.date, language)}
          </text>
        ))}
        <path className="responsive-line-chart-area" d={primaryAreaPath} />
        {rendered.series.map((lineSeries) => (
          <path
            className={`responsive-line-chart-line responsive-line-chart-line-${lineSeries.variant}`}
            d={lineSeries.path}
            key={lineSeries.id}
          />
        ))}
        {activeDate ? (
          <g className="responsive-line-chart-active">
            <line
              x1={activeDate.x}
              x2={activeDate.x}
              y1={padding.top}
              y2={rendered.chartBottom}
            />
            {rendered.series.map((lineSeries) => {
              const point = lineSeries.points.find(
                (renderedPoint) => renderedPoint.date === activeDate.date,
              );

              return point ? (
                <circle
                  className={`responsive-line-chart-active-${lineSeries.variant}`}
                  cx={point.x}
                  cy={point.y}
                  key={lineSeries.id}
                  r="5"
                />
              ) : null;
            })}
          </g>
        ) : null}
      </svg>
      {chartSeries.length > 1 ? (
        <div className="responsive-line-chart-legend">
          {chartSeries.map((lineSeries) => (
            <span key={lineSeries.id}>
              <span
                className={`responsive-line-chart-legend-dot responsive-line-chart-legend-dot-${lineSeries.variant ?? "primary"}`}
              />
              {lineSeries.label}
            </span>
          ))}
        </div>
      ) : null}
      {activeDate ? (
        <div
          className="responsive-line-chart-tooltip"
          id={tooltipId}
          style={
            {
              "--tooltip-x": `${(activeDate.x / width) * 100}%`,
              "--tooltip-y": `${((activePrimaryPoint?.y ?? padding.top) / height) * 100}%`,
            } as CSSProperties
          }
        >
          <strong>{formatLongDate(activeDate.date, language)}</strong>
          {activeTooltipItems.map((item) => (
            <span className="responsive-line-chart-tooltip-row" key={item.label}>
              <span>{item.label}</span>
              <b
                className={
                  item.variant
                    ? `responsive-line-chart-tooltip-value-${item.variant}`
                    : undefined
                }
              >
                {item.value}
              </b>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function renderSeries(series: LineChartSeries[]): {
  activeDates: ActiveDatePoint[];
  chartBottom: number;
  series: RenderedSeries[];
  xTicks: Array<{ date: string; x: number }>;
  yTicks: Array<{ value: number; y: number }>;
} {
  const dateKeys = [
    ...new Set(
      series.flatMap((lineSeries) =>
        lineSeries.points.map((point) => point.date),
      ),
    ),
  ].sort();
  const values = series.flatMap((lineSeries) =>
    lineSeries.points.map((point) => point.value),
  );
  const minimum = values.length === 0 ? 0 : Math.min(...values);
  const maximum = values.length === 0 ? 0 : Math.max(...values);
  const spread = maximum - minimum;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const chartBottom = height - padding.bottom;
  const xByDate = new Map(
    dateKeys.map(
      (date, index) =>
        [
          date,
          dateKeys.length === 1
            ? padding.left + chartWidth / 2
            : padding.left + (index / (dateKeys.length - 1)) * chartWidth,
        ] as const,
    ),
  );
  const renderedSeries = series.map((lineSeries, index) => {
    const renderedPoints = lineSeries.points
      .map((point) => {
        const x = xByDate.get(point.date);

        if (x === undefined) {
          return null;
        }

        const y =
          spread === 0
            ? padding.top + chartHeight / 2
            : padding.top + ((maximum - point.value) / spread) * chartHeight;

        return { ...point, x, y };
      })
      .filter((point): point is RenderedPoint => point !== null);

    return {
      id: lineSeries.id,
      label: lineSeries.label,
      path: toLinePath(renderedPoints),
      points: renderedPoints,
      variant: lineSeries.variant ?? (index === 0 ? "primary" : "secondary"),
    };
  });
  const activeDates = dateKeys.map((date) => ({
    date,
    x: xByDate.get(date) ?? padding.left,
  }));
  const yTickValues = spread === 0
    ? [minimum]
    : [maximum, minimum + spread / 2, minimum];
  const xTickIndexes = [
    0,
    Math.floor((dateKeys.length - 1) / 2),
    dateKeys.length - 1,
  ].filter(
    (index, position, indexes) =>
      index >= 0 && indexes.indexOf(index) === position,
  );

  return {
    activeDates,
    chartBottom,
    series: renderedSeries,
    xTicks: xTickIndexes.map((index) => ({
      date: dateKeys[index],
      x: activeDates[index].x,
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

function toTooltipPoint(
  date: string,
  series: RenderedSeries[],
): LineChartTooltipPoint {
  return {
    date,
    values: Object.fromEntries(
      series.flatMap((lineSeries) => {
        const point = lineSeries.points.find(
          (renderedPoint) => renderedPoint.date === date,
        );

        return point ? [[lineSeries.id, point.value] as const] : [];
      }),
    ),
  };
}

function toDefaultTooltipItems(
  point: LineChartTooltipPoint,
  series: LineChartSeries[],
  currency: string,
  language: ProfileLanguage,
): LineChartTooltipItem[] {
  return series.flatMap((lineSeries) => {
    const value = point.values[lineSeries.id];

    return value === undefined
      ? []
      : [
          {
            label: lineSeries.label,
            value: formatCurrency(value, currency, language),
          },
        ];
  });
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
