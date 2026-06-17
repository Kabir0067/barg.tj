"use client";
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { formatCompact } from '@/lib/format';
import styles from './AnalyticsCharts.module.css';

/** Маблағро зебо формат мекунад: 12 500 → "12 500" */
export function formatMoney(n: number | string | null | undefined): string {
  const num = Number(n || 0);
  return num.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}

/* ===================================================================== */
/*  Theme-aware chart palette — single source of truth (CSS variables)   */
/*  Used by donut + sparkline; revenue/profit strokes pull from CSS too. */
/* ===================================================================== */
export const CHART_PALETTE = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
  'var(--chart-8)',
];

/* ---- reduced-motion helper -------------------------------------------- */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

/* ---- in-view gate (animations start only when scrolled into view) ----- */
function useInView<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, seen];
}

/* ===================================================================== */
/*  Sparkline — tiny 7-point trend line for KPI cards                     */
/* ===================================================================== */
export function Sparkline({
  values,
  tone = 'brand',
  ariaLabel,
}: {
  values: number[];
  tone?: 'brand' | 'info' | 'violet' | 'danger';
  ariaLabel?: string;
}) {
  const id = useId().replace(/:/g, '');
  const [ref, inView] = useInView<SVGSVGElement>();
  const reduced = usePrefersReducedMotion();

  const pts = values.length ? values : [0, 0];
  const W = 100;
  const H = 32;
  const pad = 3;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const stepX = pts.length > 1 ? (W - pad * 2) / (pts.length - 1) : 0;
  const xOf = (i: number) => pad + i * stepX;
  const yOf = (v: number) => H - pad - ((v - min) / span) * (H - pad * 2);

  const line = pts.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ');
  const area =
    `M ${xOf(0)},${H} ` +
    pts.map((v, i) => `L ${xOf(i)},${yOf(v)}`).join(' ') +
    ` L ${xOf(pts.length - 1)},${H} Z`;

  const lastX = xOf(pts.length - 1);
  const lastY = yOf(pts[pts.length - 1]);

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${W} ${H}`}
      className={`${styles.spark} ${styles[`spark_${tone}`]}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient id={`sg-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${id})`} className={styles.sparkArea} />
      <polyline
        points={line}
        fill="none"
        className={`${styles.sparkLine} ${inView && !reduced ? styles.sparkDraw : ''}`}
      />
      <circle cx={lastX} cy={lastY} r={2.2} className={styles.sparkDot} />
    </svg>
  );
}

/* ===================================================================== */
/*  Revenue + profit area chart                                           */
/* ===================================================================== */
export interface RevenuePoint {
  label: string;
  revenue: number;
  profit: number;
}

interface HoverState {
  i: number;
  x: number; // px within wrapper
  y: number;
}

export function RevenueAreaChart({ data, revenueLabel, profitLabel }: {
  data: RevenuePoint[];
  revenueLabel: string;
  profitLabel: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 760, h: 300 });
  const [hover, setHover] = useState<HoverState | null>(null);
  const [seenRef, inView] = useInView<HTMLDivElement>();
  const reduced = usePrefersReducedMotion();
  const lineRef = useRef<SVGPolylineElement>(null);
  const profitRef = useRef<SVGPolylineElement>(null);

  const W = box.w;
  const H = box.h;
  const padL = 52; // room for y-axis money labels
  const padR = 14;
  const padTop = 18;
  const padBottom = 30;
  const innerW = W - padL - padR;
  const innerH = H - padTop - padBottom;

  const maxVal = Math.max(1, ...data.map((d) => Math.max(d.revenue, d.profit)));
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
  const xOf = (i: number) => padL + (data.length > 1 ? i * stepX : innerW / 2);
  const yOf = (v: number) => padTop + innerH - (v / maxVal) * innerH;

  const revLine = data.map((d, i) => `${xOf(i)},${yOf(d.revenue)}`).join(' ');
  const profitLine = data.map((d, i) => `${xOf(i)},${yOf(d.profit)}`).join(' ');
  const areaPath = data.length
    ? `M ${xOf(0)},${padTop + innerH} ` +
      data.map((d, i) => `L ${xOf(i)},${yOf(d.revenue)}`).join(' ') +
      ` L ${xOf(data.length - 1)},${padTop + innerH} Z`
    : '';

  const gridLevels = [0, 0.25, 0.5, 0.75, 1];
  const labelEvery = Math.max(1, Math.ceil(data.length / 7));
  const animate = inView && !reduced;

  // ResizeObserver → real pixel size so we draw at the right aspect ratio
  // (no preserveAspectRatio="none" distortion).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0].contentRect;
      setBox({ w: Math.max(280, cr.width), h: 300 });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Animated draw-in via stroke-dashoffset (measured path length).
  useEffect(() => {
    [lineRef.current, profitRef.current].forEach((el) => {
      if (!el) return;
      const len = el.getTotalLength();
      el.style.setProperty('--dash', `${len}`);
    });
  }, [revLine, profitLine, box.w]);

  if (!data.length) return <div className={styles.empty}>—</div>;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W; // px in viewBox units == px (we use 1:1)
    // nearest index
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < data.length; i++) {
      const d = Math.abs(xOf(i) - px);
      if (d < best) { best = d; nearest = i; }
    }
    const ratio = rect.width / W;
    setHover({
      i: nearest,
      x: xOf(nearest) * ratio,
      y: yOf(data[nearest].revenue) * (rect.height / H),
    });
  };

  return (
    <div className={styles.chartWrap} ref={wrapRef}>
      <div className={styles.legend}>
        <span><i className={styles.dotRevenue} /> {revenueLabel}</span>
        <span><i className={styles.dotProfit} /> {profitLabel}</span>
      </div>

      <div className={styles.chartCanvas} ref={seenRef}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          className={styles.svg}
          role="img"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.30" />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines + y-axis money labels */}
          {gridLevels.map((g) => {
            const y = padTop + innerH * g;
            const val = maxVal * (1 - g);
            return (
              <g key={g}>
                <line x1={padL} x2={W - padR} y1={y} y2={y} className={styles.grid} />
                <text x={padL - 8} y={y + 3.5} className={styles.yLabel} textAnchor="end">
                  {formatCompact(val)}
                </text>
              </g>
            );
          })}

          {/* Revenue area + lines */}
          <path d={areaPath} fill="url(#revGrad)" className={animate ? styles.areaFade : ''} />
          <polyline
            ref={lineRef}
            points={revLine}
            className={`${styles.revStroke} ${animate ? styles.drawIn : ''}`}
            fill="none"
          />
          <polyline
            ref={profitRef}
            points={profitLine}
            className={`${styles.profitStroke} ${animate ? styles.drawInDelay : ''}`}
            fill="none"
          />

          {/* Profit dots */}
          {data.map((d, i) => (
            <circle
              key={`p${i}`}
              cx={xOf(i)}
              cy={yOf(d.profit)}
              r={2.6}
              className={`${styles.profitDot} ${animate ? styles.dotFade : ''}`}
            />
          ))}

          {/* Crosshair + active markers */}
          {hover && (
            <g pointerEvents="none">
              <line
                x1={xOf(hover.i)}
                x2={xOf(hover.i)}
                y1={padTop}
                y2={padTop + innerH}
                className={styles.crosshair}
              />
              <circle cx={xOf(hover.i)} cy={yOf(data[hover.i].revenue)} r={5} className={styles.revDotActive} />
              <circle cx={xOf(hover.i)} cy={yOf(data[hover.i].profit)} r={4.5} className={styles.profitDotActive} />
            </g>
          )}

          {/* X-axis labels */}
          {data.map((d, i) =>
            i % labelEvery === 0 || i === data.length - 1 ? (
              <text key={`l${i}`} x={xOf(i)} y={H - 10} className={styles.axisLabel} textAnchor="middle">
                {d.label}
              </text>
            ) : null
          )}
        </svg>

        {/* HTML crosshair tooltip */}
        {hover && (
          <div
            className={styles.tooltip}
            style={{
              left: hover.x,
              top: Math.max(8, hover.y - 12),
            }}
          >
            <div className={styles.tipLabel}>{data[hover.i].label}</div>
            <div className={styles.tipRow}>
              <span><i className={styles.dotRevenue} /> {revenueLabel}</span>
              <strong>{formatMoney(data[hover.i].revenue)}</strong>
            </div>
            <div className={styles.tipRow}>
              <span><i className={styles.dotProfit} /> {profitLabel}</span>
              <strong>{formatMoney(data[hover.i].profit)}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================================================================== */
/*  Horizontal bar list                                                   */
/* ===================================================================== */
export interface BarItem {
  label: string;
  sublabel?: string;
  value: number;
  icon?: string;
}

export function BarList({ items, unit }: { items: BarItem[]; unit?: string }) {
  if (!items.length) return <div className={styles.empty}>—</div>;
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <div className={styles.barList}>
      {items.map((it, idx) => (
        <div key={idx} className={styles.barRow} style={{ ['--i' as string]: idx }}>
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

/* ===================================================================== */
/*  Donut — animated sweep, theme palette                                 */
/* ===================================================================== */
export interface DonutSlice {
  label: string;
  value: number;
  icon?: string;
}

export function CategoryDonut({ data, centerLabel, unit }: {
  data: DonutSlice[];
  centerLabel: string;
  unit?: string;
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState<number | null>(null);

  const R = 70;
  const C = 90;
  const stroke = 26;
  const circ = 2 * Math.PI * R;
  const total = data.reduce((s, d) => s + d.value, 0);

  // Precompute slice geometry with cumulative offset (prefix-sum, no mutation).
  const slices = useMemo(() => {
    const dashes = data.map((d) => (total ? (d.value / total) * circ : 0));
    const offsets = dashes.map((_, i) => dashes.slice(0, i).reduce((a, b) => a + b, 0));
    return data.map((d, i) => ({
      i,
      dash: dashes[i],
      offset: offsets[i],
      color: CHART_PALETTE[i % CHART_PALETTE.length],
      pct: Math.round((total ? d.value / total : 0) * 100),
      label: d.label,
      value: d.value,
    }));
  }, [data, total, circ]);

  if (!total) return <div className={styles.empty}>—</div>;

  const animate = inView && !reduced;

  return (
    <div className={styles.donutWrap} ref={ref}>
      <div className={styles.donutSvgWrap}>
        <svg viewBox="0 0 180 180" className={styles.donutSvg}>
          <circle cx={C} cy={C} r={R} fill="none" stroke="var(--border-light)" strokeWidth={stroke} />
          {slices.map((s) => (
            <circle
              key={s.i}
              cx={C}
              cy={C}
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={active === s.i ? 30 : stroke}
              strokeLinecap="butt"
              strokeDasharray={animate ? `${s.dash} ${circ - s.dash}` : `0 ${circ}`}
              strokeDashoffset={-s.offset}
              transform={`rotate(-90 ${C} ${C})`}
              className={styles.donutSeg}
              style={{ transitionDelay: animate ? `${s.i * 90}ms` : '0ms' }}
              onMouseEnter={() => setActive(s.i)}
              onMouseLeave={() => setActive(null)}
            >
              <title>{`${s.label}: ${formatMoney(s.value)} ${unit || ''} (${s.pct}%)`}</title>
            </circle>
          ))}
          <text x={C} y={C - 4} textAnchor="middle" className={styles.donutTotal}>
            {active === null ? formatMoney(total) : `${Math.round((data[active].value / total) * 100)}%`}
          </text>
          <text x={C} y={C + 16} textAnchor="middle" className={styles.donutCenter}>
            {active === null ? centerLabel : (data[active].label.length > 14 ? data[active].label.slice(0, 13) + '…' : data[active].label)}
          </text>
        </svg>
      </div>
      <div className={styles.donutLegend}>
        {data.map((d, i) => (
          <div
            key={i}
            className={`${styles.donutLegendItem} ${active === i ? styles.legendActive : ''}`}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
          >
            <i style={{ background: CHART_PALETTE[i % CHART_PALETTE.length] }} />
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

/* ===================================================================== */
/*  Status bar — horizontal stacked bar + labeled pills                   */
/* ===================================================================== */
export interface StatusItem {
  key: string;
  label: string;
  value: number;
  tone: 'info' | 'violet' | 'warning' | 'success' | 'danger';
}

export function StatusBar({ items }: { items: StatusItem[] }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const total = items.reduce((s, it) => s + it.value, 0);

  return (
    <div className={styles.statusWrap} ref={ref}>
      <div className={styles.statusBar} role="img" aria-label="order status distribution">
        {total > 0 ? (
          items.map((it) =>
            it.value > 0 ? (
              <div
                key={it.key}
                className={`${styles.statusSeg} ${styles[`tone_${it.tone}`]}`}
                style={{ width: inView ? `${(it.value / total) * 100}%` : '0%' }}
                title={`${it.label}: ${it.value}`}
              />
            ) : null
          )
        ) : (
          <div className={styles.statusEmpty} />
        )}
      </div>
      <div className={styles.statusPills}>
        {items.map((it) => (
          <div key={it.key} className={`${styles.statusPill} ${styles[`tone_${it.tone}`]}`}>
            <i />
            <span className={styles.pillLabel}>{it.label}</span>
            <strong className="tnum">{it.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
