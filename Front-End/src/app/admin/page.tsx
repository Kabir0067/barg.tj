"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag,
  PackageOpen, AlertTriangle, Download, Crown, Users, RefreshCw,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import Reveal from '@/components/Reveal';
import {
  RevenueAreaChart, BarList, CategoryDonut, Sparkline, StatusBar, formatMoney,
  type RevenuePoint, type BarItem, type DonutSlice, type StatusItem,
} from '@/components/AnalyticsCharts';
import styles from './Dashboard.module.css';

type Range = 7 | 30 | 90;

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
const todayIso = () => new Date().toISOString().slice(0, 10);

/** "2026-06-01" → "01.06" */
function shortDate(period: string): string {
  if (!period) return '';
  const d = new Date(period);
  if (isNaN(d.getTime())) return period;
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Last N points of a revenue series → sparkline values (padded so it never collapses). */
function sparkSeries(rev: RevenuePoint[], key: 'revenue' | 'profit', n = 7): number[] {
  const tail = rev.slice(-n).map((d) => d[key]);
  if (tail.length === 0) return [0, 0];
  if (tail.length === 1) return [tail[0], tail[0]];
  return tail;
}

export default function AdminDashboard() {
  const { t, lang } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [topProducts, setTopProducts] = useState<BarItem[]>([]);
  const [categories, setCategories] = useState<DonutSlice[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [range, setRange] = useState<Range>(30);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async (days: Range) => {
    setLoading(true);
    setErrored(false);
    const from = isoDaysAgo(days - 1);
    const to = todayIso();
    const params = { from, to };
    try {
      const [dash, rev, tp, cat, cust] = await Promise.all([
        apiClient.get('/analytics/dashboard/', { params }),
        apiClient.get('/analytics/revenue/', { params: { ...params, period: 'day' } }),
        apiClient.get('/analytics/top-products/', { params: { ...params, limit: 6 } }),
        apiClient.get('/analytics/category-breakdown/', { params }),
        apiClient.get('/analytics/top-customers/', { params: { limit: 6 } }),
      ]);

      setData(dash.data);
      setRevenue(
        (rev.data.data || []).map((d: any) => ({
          label: shortDate(d.period),
          revenue: Number(d.revenue || 0),
          profit: Number(d.net_profit || 0),
        }))
      );
      setTopProducts(
        (tp.data.products || []).map((p: any) => ({
          label: p.product__name_tj || '—',
          value: Number(p.total_profit || 0),
          sublabel: `${p.total_quantity} ${t('admin_sold_word')} · ${formatMoney(p.total_revenue)} TJS`,
        }))
      );
      setCategories(
        (cat.data || []).map((c: any) => ({
          label: c.product__category__name_tj || '—',
          value: Number(c.revenue || 0),
          icon: c.product__category__icon || '',
        }))
      );
      setCustomers(cust.data || []);
    } catch {
      setErrored(true);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(range); }, [range, load]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await apiClient.get('/analytics/export/', {
        params: { from: isoDaysAgo(range - 1), to: todayIso() },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `barg-report-${todayIso()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      /* silent — export failure leaves the dashboard intact */
    } finally {
      setExporting(false);
    }
  };

  const renderGrowth = (value: number | null) => {
    if (value === null || value === undefined) return null;
    if (value > 0) return <span className={styles.growthPos}><TrendingUp size={16} /> +{value}%</span>;
    if (value < 0) return <span className={styles.growthNeg}><TrendingDown size={16} /> {value}%</span>;
    return <span className={styles.growthNeu}>0%</span>;
  };

  /* ---- Loading skeleton (holds layout) -------------------------------- */
  if (loading && !data) {
    return (
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <div className={`skeleton ${styles.skTitle}`} />
          <div className={`skeleton ${styles.skToolbar}`} />
        </div>
        <div className={styles.grid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={`skeleton ${styles.skLine}`} style={{ width: '50%' }} />
                <div className={`skeleton ${styles.skIcon}`} />
              </div>
              <div className={`skeleton ${styles.skValue}`} />
              <div className={`skeleton ${styles.skSpark}`} />
              <div className={`skeleton ${styles.skLine}`} style={{ width: '70%', marginTop: '1rem' }} />
            </div>
          ))}
        </div>
        <div className={`skeleton ${styles.skChart}`} />
        <div className={styles.twoCol}>
          <div className={`skeleton ${styles.skPanel}`} />
          <div className={`skeleton ${styles.skPanel}`} />
        </div>
      </div>
    );
  }

  /* ---- Error state with retry ---------------------------------------- */
  if (errored && !data) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <div className={styles.errorIcon}><AlertTriangle size={32} /></div>
          <h2 className={styles.errorTitle}>{t('admin_error')}</h2>
          <p className={styles.errorSub}>
            {lang === 'tj'
              ? 'Пайвастшавӣ ба сервер ноком шуд. Лутфан, дубора кӯшиш кунед.'
              : 'Не удалось загрузить данные. Попробуйте ещё раз.'}
          </p>
          <button className={styles.retryBtn} onClick={() => load(range)}>
            <RefreshCw size={16} /> {lang === 'tj' ? 'Аз нав кӯшиш кунед' : 'Повторить'}
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const statusItems: StatusItem[] = [
    { key: 'new', label: t('admin_status_new'), value: data.orders_by_status.new || 0, tone: 'info' },
    { key: 'accepted', label: t('admin_status_accepted'), value: data.orders_by_status.accepted || 0, tone: 'violet' },
    { key: 'delivering', label: t('admin_status_delivering'), value: data.orders_by_status.delivering || 0, tone: 'warning' },
    { key: 'completed', label: t('admin_status_completed'), value: data.orders_by_status.completed || 0, tone: 'success' },
    { key: 'cancelled', label: t('admin_status_cancelled'), value: data.orders_by_status.cancelled || 0, tone: 'danger' },
  ];

  return (
    <div className={styles.container}>
      {/* Header + toolbar */}
      <div className={styles.headerRow}>
        <h1 className={styles.title}>{t('admin_title')}</h1>
        <div className={styles.toolbar}>
          {loading && <span className={`${styles.refreshing}`}><RefreshCw size={15} /></span>}
          <div className={styles.rangeSwitch}>
            {([7, 30, 90] as Range[]).map((r) => (
              <button
                key={r}
                className={`${styles.rangeBtn} ${range === r ? styles.rangeActive : ''}`}
                onClick={() => setRange(r)}
              >
                {t(`admin_range_${r}`)}
              </button>
            ))}
          </div>
          <button className={styles.exportBtn} onClick={handleExport} disabled={exporting}>
            <Download size={16} /> {exporting ? '...' : t('admin_export_csv')}
          </button>
        </div>
      </div>

      {/* Top KPIs */}
      <div className={styles.grid}>
        <Reveal as="div" className={`${styles.card} ${styles.accentGreen}`} delay={0}>
          <span className={styles.accentStrip} />
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>{t('admin_net_profit_today')}</h3>
            <div className={`${styles.iconWrapper} ${styles.iconGreen}`}><DollarSign size={22} /></div>
          </div>
          <div className={`${styles.cardValue} tnum`}>{formatMoney(data.today.net_profit)} <span className={styles.unit}>TJS</span></div>
          <div className={styles.sparkRow}>
            <Sparkline values={sparkSeries(revenue, 'profit')} tone="brand" ariaLabel={t('admin_net_profit_today')} />
          </div>
          <div className={styles.cardFooter}>
            {t('admin_growth_compare')}: {renderGrowth(data.comparison.profit_growth_dod)}
          </div>
        </Reveal>

        <Reveal as="div" className={`${styles.card} ${styles.accentBlue}`} delay={70}>
          <span className={styles.accentStrip} />
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>{t('admin_revenue_today')}</h3>
            <div className={`${styles.iconWrapper} ${styles.iconBlue}`}><DollarSign size={22} /></div>
          </div>
          <div className={`${styles.cardValue} tnum`}>{formatMoney(data.today.revenue)} <span className={styles.unit}>TJS</span></div>
          <div className={styles.sparkRow}>
            <Sparkline values={sparkSeries(revenue, 'revenue')} tone="info" ariaLabel={t('admin_revenue_today')} />
          </div>
          <div className={styles.cardFooter}>
            {t('admin_growth_compare')}: {renderGrowth(data.comparison.revenue_growth_dod)}
          </div>
        </Reveal>

        <Reveal as="div" className={`${styles.card} ${styles.accentPurple}`} delay={140}>
          <span className={styles.accentStrip} />
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>{t('admin_orders_today')}</h3>
            <div className={`${styles.iconWrapper} ${styles.iconPurple}`}><ShoppingBag size={22} /></div>
          </div>
          <div className={`${styles.cardValue} tnum`}>{data.today.orders_count}</div>
          <div className={styles.sparkRow}>
            <Sparkline
              values={sparkSeries(revenue, 'revenue')}
              tone="violet"
              ariaLabel={t('admin_orders_today')}
            />
          </div>
          <div className={styles.cardFooter}>
            {t('admin_growth_compare')}: {renderGrowth(data.comparison.orders_growth)}
          </div>
        </Reveal>

        <Reveal as="div" className={`${styles.card} ${styles.accentRed}`} delay={210}>
          <span className={styles.accentStrip} />
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>{t('admin_low_stock')}</h3>
            <div className={`${styles.iconWrapper} ${styles.iconRed}`}><AlertTriangle size={22} /></div>
          </div>
          <div className={`${styles.cardValue} tnum`}>{data.inventory.low_stock}</div>
          <div className={styles.sparkRow}>
            <div className={styles.stockMini}>
              <span className={styles.stockBadge}>
                {t('admin_out_of_stock')}: <strong className={styles.textRed}>{data.inventory.out_of_stock}</strong>
              </span>
            </div>
          </div>
          <div className={styles.cardFooter}>
            {lang === 'tj' ? 'Назорати анбор' : 'Контроль склада'}
          </div>
        </Reveal>
      </div>

      {/* Revenue & profit chart */}
      <Reveal as="div" className={styles.chartCard} delay={0}>
        <div className={styles.chartCardHeader}>
          <div>
            <h2 className={styles.chartTitle}>{t('admin_chart_revenue_title')}</h2>
            <p className={styles.chartSub}>{t('admin_chart_revenue_sub')}</p>
          </div>
        </div>
        {revenue.length ? (
          <RevenueAreaChart data={revenue} revenueLabel={t('admin_revenue')} profitLabel={t('admin_profit')} />
        ) : (
          <div className={styles.noData}>{t('admin_no_data')}</div>
        )}
      </Reveal>

      {/* Top products + categories */}
      <div className={styles.twoCol}>
        <Reveal as="div" className={styles.panel} delay={0}>
          <h2 className={styles.panelTitle}><Crown size={18} /> {t('admin_top_products_title')}</h2>
          {topProducts.length ? <BarList items={topProducts} unit="TJS" /> : <div className={styles.noData}>{t('admin_no_data')}</div>}
        </Reveal>

        <Reveal as="div" className={styles.panel} delay={90}>
          <h2 className={styles.panelTitle}><PackageOpen size={18} /> {t('admin_category_title')}</h2>
          {categories.length ? (
            <CategoryDonut data={categories} centerLabel={t('admin_donut_center')} unit="TJS" />
          ) : (
            <div className={styles.noData}>{t('admin_no_data')}</div>
          )}
        </Reveal>
      </div>

      {/* Capital & inventory KPIs */}
      <h2 className={styles.sectionTitle}>{t('admin_capital_title')}</h2>
      <div className={styles.grid}>
        <Reveal as="div" className={styles.card} delay={0}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>{t('admin_wholesale_value')}</h3>
            <div className={`${styles.iconWrapper} ${styles.iconNeutral}`}><PackageOpen size={20} /></div>
          </div>
          <div className={`${styles.cardValue} tnum`}>{formatMoney(data.inventory.total_wholesale_value)} <span className={styles.unit}>TJS</span></div>
        </Reveal>
        <Reveal as="div" className={styles.card} delay={70}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>{t('admin_retail_value')}</h3>
            <div className={`${styles.iconWrapper} ${styles.iconGreen}`}><DollarSign size={20} /></div>
          </div>
          <div className={`${styles.cardValue} tnum`}>{formatMoney(data.inventory.total_retail_value)} <span className={styles.unit}>TJS</span></div>
        </Reveal>
        <Reveal as="div" className={styles.card} delay={140}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>{t('admin_potential_profit')}</h3>
            <div className={`${styles.iconWrapper} ${styles.iconBlue}`}><TrendingUp size={20} /></div>
          </div>
          <div className={`${styles.cardValue} tnum`}>{formatMoney(data.inventory.potential_profit)} <span className={styles.unit}>TJS</span></div>
        </Reveal>
        <Reveal as="div" className={styles.card} delay={210}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>{t('admin_restock_budget')}</h3>
            <div className={`${styles.iconWrapper} ${styles.iconOrange}`}><AlertTriangle size={20} /></div>
          </div>
          <div className={`${styles.cardValue} tnum`}>{formatMoney(data.inventory.restock_budget_needed)} <span className={styles.unit}>TJS</span></div>
        </Reveal>
      </div>

      {/* Summary + status */}
      <div className={styles.summaryGrid}>
        <Reveal as="div" className={styles.summaryCard} delay={0}>
          <h3 className={styles.cardTitle}>{t('admin_summary_30')}</h3>
          <ul className={styles.list}>
            <li><span>{t('admin_total_revenue')}:</span> <strong className="tnum">{formatMoney(data.month.revenue)} TJS</strong></li>
            <li><span>{t('admin_profit')}:</span> <strong className="tnum">{formatMoney(data.month.net_profit)} TJS</strong></li>
            <li><span>{t('admin_average_order')}:</span> <strong className="tnum">{formatMoney(data.month.average_order_value)} TJS</strong></li>
            <li><span>{t('admin_orders_count')}:</span> <strong className="tnum">{data.month.orders_count}</strong></li>
            <li><span>{t('admin_margin')}:</span> <strong className="tnum">{data.kpi.margin_percentage}%</strong></li>
            <li><span>{t('admin_conversion')}:</span> <strong className="tnum">{data.kpi.order_conversion_rate}%</strong></li>
            <li><span>{t('admin_customers_total')}:</span> <strong className="tnum">{data.total_customers}</strong></li>
          </ul>
        </Reveal>

        <Reveal as="div" className={styles.summaryCard} delay={90}>
          <h3 className={styles.cardTitle}>{t('admin_order_status_title')}</h3>
          <StatusBar items={statusItems} />
        </Reveal>
      </div>

      {/* Top customers */}
      <Reveal as="div" className={styles.panel} delay={0}>
        <h2 className={styles.panelTitle}><Users size={18} /> {t('admin_top_customers_title')}</h2>
        {customers.length ? (
          <div className={styles.customerList}>
            {customers.map((c, i) => (
              <div key={c.id} className={styles.customerRow}>
                <span className={`${styles.rank} ${i === 0 ? styles.rankGold : i === 1 ? styles.rankSilver : i === 2 ? styles.rankBronze : ''}`}>{i + 1}</span>
                <div className={styles.customerInfo}>
                  <strong>{c.name || t('ord_no_courier')}</strong>
                  <span>{c.phone}</span>
                </div>
                <div className={styles.customerStats}>
                  <strong className="tnum">{formatMoney(c.total_spent)} TJS</strong>
                  <span>{c.orders_count} {t('admin_orders_word')}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.noData}>{t('admin_no_data')}</div>
        )}
      </Reveal>
    </div>
  );
}
