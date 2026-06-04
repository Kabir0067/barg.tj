"use client";
import React from 'react';
import styles from './AnalyticsCharts.module.css';

/** Маблағро зебо формат мекунад: 12 500 → "12 500" */
export function formatMoney(n: number | string | null | undefined): string {
  const num = Number(n || 0);
  return num.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}

export interface RevenuePoint {
  label: string;
  revenue: number;
  profit: number;
}

/**
 * Графики даромад ва фоидаи соф (SVG, responsive).
 * Майдони пуршудаи даромад + хатти фоида бо нуқтаҳои интерактивӣ.
 */
export function RevenueAreaChart({ data, revenueLabel, profitLabel }: {
  data: RevenuePoint[];
  revenueLabel: string;
  profitLabel: string;
}) {
  const W = 760;
  const H = 280;
  const padX = 16;
  const padTop = 24;
  const padBottom = 34;

  if (!data.length) {
    return <div className={styles.empty}>—</div>;
  }

  const maxVal = Math.max(1, ...data.map((d) => Math.max(d.revenue, d.profit)));
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBottom;
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;

  const xOf = (i: number) => padX + (data.length > 1 ? i * stepX : innerW / 2);
  const yOf = (v: number) => padTop + innerH - (v / maxVal) * innerH;

  const revLine = data.map((d, i) => `${xOf(i)},${yOf(d.revenue)}`).join(' ');
  const profitLine = data.map((d, i) => `${xOf(i)},${yOf(d.profit)}`).join(' ');
  const areaPath =
    `M ${xOf(0)},${padTop + innerH} ` +
    data.map((d, i) => `L ${xOf(i)},${yOf(d.revenue)}`).join(' ') +
    ` L ${xOf(data.length - 1)},${padTop + innerH} Z`;

  // Танҳо чанд нишона дар меҳвари X нишон медиҳем, то печида нашавад
  const labelEvery = Math.ceil(data.length / 7);

  return (
    <div className={styles.chartWrap}>
      <div className={styles.legend}>
        <span><i className={styles.dotRevenue} /> {revenueLabel}</span>
        <span><i className={styles.dotProfit} /> {profitLabel}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} preserveAspectRatio="none" role="img">
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Хатҳои тӯрӣ */}
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <line
            key={g}
            x1={padX}
            x2={W - padX}
            y1={padTop + innerH * g}
            y2={padTop + innerH * g}
            className={styles.grid}
          />
        ))}

        {/* Майдони даромад */}
        <path d={areaPath} fill="url(#revGrad)" />
        <polyline points={revLine} className={styles.revStroke} fill="none" />
        <polyline points={profitLine} className={styles.profitStroke} fill="none" />

        {/* Нуқтаҳо бо tooltip-и худкори SVG */}
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={xOf(i)} cy={yOf(d.revenue)} r={3.5} className={styles.revDot}>
              <title>{`${d.label}\n${revenueLabel}: ${formatMoney(d.revenue)}\n${profitLabel}: ${formatMoney(d.profit)}`}</title>
            </circle>
          </g>
        ))}

        {/* Нишонаҳои меҳвари X */}
        {data.map((d, i) =>
          i % labelEvery === 0 || i === data.length - 1 ? (
            <text key={`l${i}`} x={xOf(i)} y={H - 12} className={styles.axisLabel} textAnchor="middle">
              {d.label}
            </text>
          ) : null
        )}
      </svg>
    </div>
  );
}

export interface BarItem {
  label: string;
  sublabel?: string;
  value: number;
  icon?: string;
}

/** Рӯйхати уфуқии диаграммаҳо (барои Топ-маҳсулот, категорияҳо) */
export function BarList({ items, unit }: { items: BarItem[]; unit?: string }) {
  if (!items.length) return <div className={styles.empty}>—</div>;
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <div className={styles.barList}>
      {items.map((it, idx) => (
        <div key={idx} className={styles.barRow}>
          <div className={styles.barInfo}>
            <span className={styles.barLabel}>
              {it.icon ? <span className={styles.barIcon}>{it.icon}</span> : null}
              {it.label}
            </span>
            <strong className={styles.barValue}>
              {formatMoney(it.value)} {unit}
            </strong>
          </div>
          <div className={styles.barTrack}>
            <div className={styles.barFill} style={{ width: `${(it.value / max) * 100}%` }} />
          </div>
          {it.sublabel ? <span className={styles.barSub}>{it.sublabel}</span> : null}
        </div>
      ))}
    </div>
  );
}

export interface DonutSlice {
  label: string;
  value: number;
  icon?: string;
}

const DONUT_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f97316', '#eab308', '#ec4899', '#14b8a6', '#64748b'];

/** Диаграммаи ҳалқавӣ (donut) барои тақсими даромад аз рӯи категорияҳо */
export function CategoryDonut({ data, centerLabel, unit }: {
  data: DonutSlice[];
  centerLabel: string;
  unit?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <div className={styles.empty}>—</div>;

  const R = 70;
  const C = 90;
  const stroke = 26;
  const circ = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className={styles.donutWrap}>
      <svg viewBox="0 0 180 180" className={styles.donutSvg}>
        <circle cx={C} cy={C} r={R} fill="none" stroke="var(--border-light)" strokeWidth={stroke} />
        {data.map((d, i) => {
          const frac = d.value / total;
          const dash = frac * circ;
          const seg = (
            <circle
              key={i}
              cx={C}
              cy={C}
              r={R}
              fill="none"
              stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${C} ${C})`}
              className={styles.donutSeg}
            >
              <title>{`${d.label}: ${formatMoney(d.value)} ${unit || ''} (${Math.round(frac * 100)}%)`}</title>
            </circle>
          );
          offset += dash;
          return seg;
        })}
        <text x={C} y={C - 4} textAnchor="middle" className={styles.donutTotal}>
          {formatMoney(total)}
        </text>
        <text x={C} y={C + 16} textAnchor="middle" className={styles.donutCenter}>
          {centerLabel}
        </text>
      </svg>
      <div className={styles.donutLegend}>
        {data.map((d, i) => (
          <div key={i} className={styles.donutLegendItem}>
            <i style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span className={styles.donutLegendLabel}>
              {d.icon ? `${d.icon} ` : ''}{d.label}
            </span>
            <strong>{Math.round((d.value / total) * 100)}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
