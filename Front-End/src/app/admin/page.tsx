"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag,
  PackageOpen, AlertTriangle, Download, Crown, Users,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import {
  RevenueAreaChart, BarList, CategoryDonut, formatMoney,
  type RevenuePoint, type BarItem, type DonutSlice,
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

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [topProducts, setTopProducts] = useState<BarItem[]>([]);
  const [categories, setCategories] = useState<DonutSlice[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>(30);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async (days: Range) => {
    setLoading(true);
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
    } catch (err) {
      console.error('Dashboard fetch error', err);
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
    } catch (err) {
      console.error('Export error', err);
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

  if (loading && !data) return <div className={styles.loading}>{t('admin_loading')}</div>;
  if (!data) return <div className={styles.error}>{t('admin_error')}</div>;

  return (
    <div className={styles.container}>
      {/* Header + toolbar */}
      <div className={styles.headerRow}>
        <h1 className={styles.title}>{t('admin_title')}</h1>
        <div className={styles.toolbar}>
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
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>{t('admin_net_profit_today')}</h3>
            <div className={`${styles.iconWrapper} ${styles.iconGreen}`}><DollarSign size={24} /></div>
          </div>
          <div className={styles.cardValue}>{formatMoney(data.today.net_profit)} <span className={styles.unit}>TJS</span></div>
          <div className={styles.cardFooter}>
            {t('admin_growth_compare')}: {renderGrowth(data.comparison.profit_growth_dod)}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>{t('admin_revenue_today')}</h3>
            <div className={`${styles.iconWrapper} ${styles.iconBlue}`}><DollarSign size={24} /></div>
          </div>
          <div className={styles.cardValue}>{formatMoney(data.today.revenue)} <span className={styles.unit}>TJS</span></div>
          <div className={styles.cardFooter}>
            {t('admin_growth_compare')}: {renderGrowth(data.comparison.revenue_growth_dod)}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>{t('admin_orders_today')}</h3>
            <div className={`${styles.iconWrapper} ${styles.iconPurple}`}><ShoppingBag size={24} /></div>
          </div>
          <div className={styles.cardValue}>{data.today.orders_count}</div>
          <div className={styles.cardFooter}>
            {t('admin_growth_compare')}: {renderGrowth(data.comparison.orders_growth)}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>{t('admin_low_stock')}</h3>
            <div className={`${styles.iconWrapper} ${styles.iconRed}`}><AlertTriangle size={24} /></div>
          </div>
          <div className={styles.cardValue}>{data.inventory.low_stock}</div>
          <div className={styles.cardFooter}>
            {t('admin_out_of_stock')}: <strong className={styles.textRed}>{data.inventory.out_of_stock}</strong>
          </div>
        </div>
      </div>

      {/* Revenue & profit chart */}
      <div className={styles.chartCard}>
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
      </div>

      {/* Top products + categories */}
      <div className={styles.twoCol}>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}><Crown size={18} /> {t('admin_top_products_title')}</h2>
          {topProducts.length ? <BarList items={topProducts} unit="TJS" /> : <div className={styles.noData}>{t('admin_no_data')}</div>}
        </div>

        <div className={styles.panel}>
          <h2 className={styles.panelTitle}><PackageOpen size={18} /> {t('admin_category_title')}</h2>
          {categories.length ? (
            <CategoryDonut data={categories} centerLabel={t('admin_donut_center')} unit="TJS" />
          ) : (
            <div className={styles.noData}>{t('admin_no_data')}</div>
          )}
        </div>
      </div>

      {/* Capital & inventory KPIs */}
      <h2 className={styles.sectionTitle}>{t('admin_capital_title')}</h2>
      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>{t('admin_wholesale_value')}</h3>
            <PackageOpen size={24} className={styles.textGray} />
          </div>
          <div className={styles.cardValue}>{formatMoney(data.inventory.total_wholesale_value)} <span className={styles.unit}>TJS</span></div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>{t('admin_retail_value')}</h3>
            <DollarSign size={24} className={styles.textGreen} />
          </div>
          <div className={styles.cardValue}>{formatMoney(data.inventory.total_retail_value)} <span className={styles.unit}>TJS</span></div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>{t('admin_potential_profit')}</h3>
            <TrendingUp size={24} className={styles.textBlue} />
          </div>
          <div className={styles.cardValue}>{formatMoney(data.inventory.potential_profit)} <span className={styles.unit}>TJS</span></div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>{t('admin_restock_budget')}</h3>
            <AlertTriangle size={24} className={styles.textOrange} />
          </div>
          <div className={styles.cardValue}>{formatMoney(data.inventory.restock_budget_needed)} <span className={styles.unit}>TJS</span></div>
        </div>
      </div>

      {/* Summary + status + VIP customers */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <h3 className={styles.cardTitle}>{t('admin_summary_30')}</h3>
          <ul className={styles.list}>
            <li><span>{t('admin_total_revenue')}:</span> <strong>{formatMoney(data.month.revenue)} TJS</strong></li>
            <li><span>{t('admin_profit')}:</span> <strong>{formatMoney(data.month.net_profit)} TJS</strong></li>
            <li><span>{t('admin_average_order')}:</span> <strong>{formatMoney(data.month.average_order_value)} TJS</strong></li>
            <li><span>{t('admin_orders_count')}:</span> <strong>{data.month.orders_count}</strong></li>
            <li><span>{t('admin_margin')}:</span> <strong>{data.kpi.margin_percentage}%</strong></li>
            <li><span>{t('admin_conversion')}:</span> <strong>{data.kpi.order_conversion_rate}%</strong></li>
            <li><span>{t('admin_customers_total')}:</span> <strong>{data.total_customers}</strong></li>
          </ul>
        </div>

        <div className={styles.summaryCard}>
          <h3 className={styles.cardTitle}>{t('admin_order_status_title')}</h3>
          <ul className={styles.list}>
            <li><span>{t('admin_status_new')}:</span> <strong className={styles.textBlue}>{data.orders_by_status.new}</strong></li>
            <li><span>{t('admin_status_accepted')}:</span> <strong className={styles.textPurple}>{data.orders_by_status.accepted}</strong></li>
            <li><span>{t('admin_status_delivering')}:</span> <strong className={styles.textOrange}>{data.orders_by_status.delivering}</strong></li>
            <li><span>{t('admin_status_completed')}:</span> <strong className={styles.textGreen}>{data.orders_by_status.completed}</strong></li>
            <li><span>{t('admin_status_cancelled')}:</span> <strong className={styles.textRed}>{data.orders_by_status.cancelled}</strong></li>
          </ul>
        </div>
      </div>

      {/* Top customers */}
      <div className={styles.panel}>
        <h2 className={styles.panelTitle}><Users size={18} /> {t('admin_top_customers_title')}</h2>
        {customers.length ? (
          <div className={styles.customerList}>
            {customers.map((c, i) => (
              <div key={c.id} className={styles.customerRow}>
                <span className={styles.rank}>{i + 1}</span>
                <div className={styles.customerInfo}>
                  <strong>{c.name || t('ord_no_courier')}</strong>
                  <span>{c.phone}</span>
                </div>
                <div className={styles.customerStats}>
                  <strong>{formatMoney(c.total_spent)} TJS</strong>
                  <span>{c.orders_count} {t('admin_orders_word')}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.noData}>{t('admin_no_data')}</div>
        )}
      </div>
    </div>
  );
}
