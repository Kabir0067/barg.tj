"use client";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import { formatPrice } from '@/lib/format';
import {
  Package, Phone, MapPin, Clock, Truck, CheckCircle2,
  XCircle, CircleCheck, User, RefreshCw, Trash2, Search,
  ArrowDownAZ, Eye, X, Sparkles, AlertTriangle, ChevronRight,
} from 'lucide-react';
import styles from './AdminOrders.module.css';

type OrderItem = {
  id: number;
  product_name: string;
  price_at_order: string;
  quantity: number;
  subtotal: string;
};

type Order = {
  id: number;
  number: string;
  status: string;
  status_display: string;
  payment_method_display: string;
  customer_name: string;
  customer_phone: string;
  address_village: string;
  address_street?: string;
  address_house?: string;
  address_landmark?: string;
  total: string;
  delivery_fee: string;
  items: OrderItem[];
  notes?: string;
  assigned_worker: number | null;
  assigned_worker_name?: string;
  created_at: string;
};

type Staff = { id: number; name: string; phone: string };

const STATUS_TABS = ['all', 'NEW', 'ACCEPTED', 'DELIVERING', 'COMPLETED', 'CANCELLED'];
const TIMELINE = ['NEW', 'ACCEPTED', 'DELIVERING', 'COMPLETED'] as const;
type SortKey = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';

export default function AdminOrders() {
  const { t, lang } = useLanguage();
  const toast = useToast();
  const confirm = useConfirm();

  const [orders, setOrders] = useState<Order[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('date_desc');
  const [detailId, setDetailId] = useState<number | null>(null);

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      NEW: t('admin_status_new'),
      ACCEPTED: t('admin_status_accepted'),
      DELIVERING: t('admin_status_delivering'),
      COMPLETED: t('admin_status_completed'),
      CANCELLED: t('admin_status_cancelled'),
    };
    return map[s] || s;
  };

  const fetchOrders = useCallback(async () => {
    setError(false);
    setLoading(true);
    try {
      const [oRes, sRes] = await Promise.all([
        apiClient.get('/orders/'),
        apiClient.get('/staff/'),
      ]);
      setOrders(oRes.data.results || oRes.data || []);
      setStaff(sRes.data.results || sRes.data || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  /* ---- Optimistic status / courier updates with rollback ---- */
  const patchOrder = async (
    id: number,
    payload: Record<string, unknown>,
    optimistic: Partial<Order>,
  ) => {
    const snapshot = orders;
    setBusyId(id);
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...optimistic } : o)));
    try {
      const res = await apiClient.patch(`/orders/${id}/`, payload);
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...res.data } : o)));
    } catch {
      setOrders(snapshot); // rollback
      toast.error(t('admin_err_save'));
    } finally {
      setBusyId(null);
    }
  };

  const changeStatus = async (order: Order, status: string) => {
    if (status === 'CANCELLED') {
      const ok = await confirm({
        title: t('ord_mark_cancelled'),
        message: t('ord_confirm_cancel'),
        danger: true,
        confirmText: t('ord_mark_cancelled'),
        cancelText: lang === 'ru' ? 'Назад' : 'Бекор',
      });
      if (!ok) return;
    }
    const payload: Record<string, unknown> = { status };
    if (status === 'ACCEPTED') payload.accepted_via = 'site';
    patchOrder(order.id, payload, { status, status_display: statusLabel(status) });
  };

  const assignCourier = (order: Order, workerId: string) => {
    const id = workerId ? Number(workerId) : null;
    const name = id ? (staff.find((s) => s.id === id)?.name || staff.find((s) => s.id === id)?.phone || '') : '';
    patchOrder(order.id, { assigned_worker: id }, { assigned_worker: id, assigned_worker_name: name });
  };

  const deleteOrder = async (id: number) => {
    const ok = await confirm({
      title: lang === 'ru' ? 'Удалить заказ' : 'Заказро нест кардан',
      message: lang === 'ru' ? 'Удалить этот заказ навсегда? Это действие необратимо.' : 'Ин заказро тамоман пок кунед? Ин амал бебозгашт аст.',
      danger: true,
      confirmText: lang === 'ru' ? 'Удалить' : 'Нест кардан',
      cancelText: lang === 'ru' ? 'Назад' : 'Бекор',
    });
    if (!ok) return;
    const snapshot = orders;
    setBusyId(id);
    setOrders((prev) => prev.filter((o) => o.id !== id));
    try {
      await apiClient.delete(`/orders/${id}/`);
      if (detailId === id) setDetailId(null);
      toast.success(lang === 'ru' ? 'Заказ удалён' : 'Заказ нест карда шуд');
    } catch {
      setOrders(snapshot); // rollback
      toast.error(t('admin_err_save'));
    } finally {
      setBusyId(null);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(lang === 'ru' ? 'ru-RU' : 'tg-TJ', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const countFor = (s: string) =>
    s === 'all' ? orders.length : orders.filter((o) => o.status === s).length;

  /* ---- KPI summary ---- */
  const kpis = useMemo(() => {
    const today = new Date();
    const isToday = (iso: string) => {
      const d = new Date(iso);
      return d.getFullYear() === today.getFullYear()
        && d.getMonth() === today.getMonth()
        && d.getDate() === today.getDate();
    };
    const todaysOrders = orders.filter((o) => isToday(o.created_at));
    const revenueToday = todaysOrders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((acc, o) => acc + Number(o.total || 0), 0);
    return {
      new: orders.filter((o) => o.status === 'NEW').length,
      active: orders.filter((o) => o.status === 'ACCEPTED' || o.status === 'DELIVERING').length,
      today: todaysOrders.length,
      revenueToday,
    };
  }, [orders]);

  /* ---- Filter + search + sort ---- */
  const visible = useMemo(() => {
    let list = filter === 'all' ? orders : orders.filter((o) => o.status === filter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((o) =>
        o.number.toLowerCase().includes(q)
        || (o.customer_name || '').toLowerCase().includes(q)
        || (o.customer_phone || '').toLowerCase().includes(q),
      );
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sort) {
        case 'date_asc': return +new Date(a.created_at) - +new Date(b.created_at);
        case 'amount_desc': return Number(b.total) - Number(a.total);
        case 'amount_asc': return Number(a.total) - Number(b.total);
        default: return +new Date(b.created_at) - +new Date(a.created_at);
      }
    });
    return sorted;
  }, [orders, filter, search, sort]);

  const detail = orders.find((o) => o.id === detailId) || null;

  /* ---- Status timeline (for drill-down) ---- */
  const timelineState = (order: Order) => {
    if (order.status === 'CANCELLED') {
      return TIMELINE.map((s) => ({ key: s, done: false, current: false, cancelled: true }));
    }
    const idx = TIMELINE.indexOf(order.status as typeof TIMELINE[number]);
    return TIMELINE.map((s, i) => ({
      key: s,
      done: i < idx,
      current: i === idx,
      cancelled: false,
    }));
  };

  const TIMELINE_ICON: Record<string, React.ReactNode> = {
    NEW: <Sparkles size={15} />,
    ACCEPTED: <CheckCircle2 size={15} />,
    DELIVERING: <Truck size={15} />,
    COMPLETED: <CircleCheck size={15} />,
  };

  const addressOf = (o: Order) =>
    `${o.address_village}${o.address_street ? `, ${o.address_street}` : ''}${o.address_house ? `, ${o.address_house}` : ''}${o.address_landmark ? ` — ${o.address_landmark}` : ''}`;

  const sortLabel = (k: SortKey) => {
    const ru: Record<SortKey, string> = {
      date_desc: 'Сначала новые', date_asc: 'Сначала старые',
      amount_desc: 'Сумма ↓', amount_asc: 'Сумма ↑',
    };
    const tj: Record<SortKey, string> = {
      date_desc: 'Аввал навтарин', date_asc: 'Аввал кӯҳна',
      amount_desc: 'Маблағ ↓', amount_asc: 'Маблағ ↑',
    };
    return (lang === 'ru' ? ru : tj)[k];
  };

  /* ---------------- RENDER ---------------- */
  return (
    <div className={styles.container}>
      {/* Shared page header */}
      <header className={styles.header}>
        <div className={styles.headLeft}>
          <h1 className={styles.title}>{t('ord_title')}</h1>
          <p className={styles.subtitle}>{t('ord_subtitle')}</p>
        </div>
        <button
          className={styles.refreshBtn}
          onClick={fetchOrders}
          disabled={loading}
          aria-label={lang === 'ru' ? 'Обновить' : 'Навсозӣ'}
        >
          <RefreshCw size={18} className={loading ? styles.spinning : ''} />
        </button>
      </header>

      {/* KPI strip */}
      <div className={styles.kpis}>
        <KpiCard
          loading={loading}
          tone="info"
          icon={<Sparkles size={18} />}
          label={t('admin_status_new')}
          value={kpis.new}
        />
        <KpiCard
          loading={loading}
          tone="warning"
          icon={<Truck size={18} />}
          label={lang === 'ru' ? 'В работе' : 'Дар кор'}
          value={kpis.active}
        />
        <KpiCard
          loading={loading}
          tone="brand"
          icon={<Package size={18} />}
          label={lang === 'ru' ? 'Заказов сегодня' : 'Заказҳои имрӯз'}
          value={kpis.today}
        />
        <KpiCard
          loading={loading}
          tone="success"
          icon={<CircleCheck size={18} />}
          label={lang === 'ru' ? 'Выручка сегодня' : 'Даромади имрӯз'}
          value={formatPrice(kpis.revenueToday)}
          wide
        />
      </div>

      {/* Tabs */}
      <div className={styles.tabs} role="tablist">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={filter === s}
            className={`${styles.tab} ${filter === s ? styles.tabActive : ''}`}
            onClick={() => setFilter(s)}
          >
            {s === 'all' ? t('ord_filter_all') : statusLabel(s)}
            <span className={styles.tabCount}>{countFor(s)}</span>
          </button>
        ))}
      </div>

      {/* Toolbar: search + sort */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={17} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === 'ru' ? 'Поиск по номеру, имени, телефону…' : 'Ҷустуҷӯ бо рақам, ном, телефон…'}
            aria-label={lang === 'ru' ? 'Поиск заказов' : 'Ҷустуҷӯи заказҳо'}
          />
          {search && (
            <button className={styles.clearSearch} onClick={() => setSearch('')} aria-label={lang === 'ru' ? 'Очистить' : 'Тоза'}>
              <X size={15} />
            </button>
          )}
        </div>
        <label className={styles.sortBox}>
          <ArrowDownAZ size={16} />
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label={lang === 'ru' ? 'Сортировка' : 'Мураттабсозӣ'}>
            <option value="date_desc">{sortLabel('date_desc')}</option>
            <option value="date_asc">{sortLabel('date_asc')}</option>
            <option value="amount_desc">{sortLabel('amount_desc')}</option>
            <option value="amount_asc">{sortLabel('amount_asc')}</option>
          </select>
        </label>
      </div>

      {/* Content states */}
      {loading ? (
        <div className={styles.list} aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <div className={styles.stateBox}>
          <AlertTriangle size={46} className={styles.stateErrIcon} />
          <p>{lang === 'ru' ? 'Не удалось загрузить заказы.' : 'Заказҳо бор нашуданд.'}</p>
          <button className="btn-primary" onClick={fetchOrders}>
            <RefreshCw size={16} /> {lang === 'ru' ? 'Повторить' : 'Аз нав'}
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className={styles.stateBox}>
          <Package size={48} className={styles.stateIcon} />
          <p>{search.trim() ? (lang === 'ru' ? 'По запросу ничего не найдено' : 'Чизе ёфт нашуд') : t('ord_empty')}</p>
          {search.trim() && (
            <button className="btn-outline" onClick={() => setSearch('')}>
              {lang === 'ru' ? 'Сбросить поиск' : 'Тоза кардани ҷустуҷӯ'}
            </button>
          )}
        </div>
      ) : (
        <div className={styles.list}>
          {visible.map((order) => {
            const isBusy = busyId === order.id;
            const terminal = order.status === 'COMPLETED' || order.status === 'CANCELLED';
            return (
              <article key={order.id} className={`${styles.card} ${isBusy ? styles.cardBusy : ''}`}>
                <div className={styles.cardTop}>
                  <button
                    className={styles.orderNumber}
                    onClick={() => setDetailId(order.id)}
                    aria-label={lang === 'ru' ? `Открыть заказ ${order.number}` : `Заказ ${order.number}-ро кушоед`}
                  >
                    {order.number}
                    <ChevronRight size={15} />
                  </button>
                  <span className={`${styles.badge} ${styles['st_' + order.status]} ${order.status === 'NEW' ? styles.badgePulse : ''}`}>
                    {statusLabel(order.status)}
                  </span>
                </div>

                <div className={styles.meta}>
                  <span data-label className={styles.metaItem}><User size={14} /> {order.customer_name}</span>
                  <a href={`tel:${order.customer_phone}`} className={styles.metaItem}><Phone size={14} /> {order.customer_phone}</a>
                  <span className={styles.metaItem}><Clock size={14} /> {formatDate(order.created_at)}</span>
                </div>

                <div className={styles.address}>
                  <MapPin size={14} />
                  <span data-label>{addressOf(order)}</span>
                </div>

                <ul className={styles.items}>
                  {order.items.slice(0, 4).map((it) => (
                    <li key={it.id}>
                      <span data-label>{it.product_name}</span>
                      <span className={styles.itemQty}>{it.quantity} × {formatPrice(it.price_at_order)}</span>
                    </li>
                  ))}
                  {order.items.length > 4 && (
                    <li className={styles.moreItems}>
                      <button className={styles.linkBtn} onClick={() => setDetailId(order.id)}>
                        +{order.items.length - 4} {lang === 'ru' ? 'ещё' : 'боз'}
                      </button>
                    </li>
                  )}
                </ul>

                {order.notes && <p className={styles.notes}>{order.notes}</p>}

                <div className={styles.totals}>
                  <span data-label>{t('ord_payment')}: <strong>{order.payment_method_display}</strong></span>
                  <span className={styles.total}>{t('ord_total')}: <strong>{formatPrice(order.total)}</strong></span>
                </div>

                {!terminal && (
                  <div className={styles.courierRow}>
                    <Truck size={16} />
                    <select
                      value={order.assigned_worker ?? ''}
                      onChange={(e) => assignCourier(order, e.target.value)}
                      disabled={isBusy}
                      aria-label={t('ord_assign_courier')}
                    >
                      <option value="">{t('ord_no_courier')}</option>
                      {staff.map((s) => (
                        <option key={s.id} value={s.id}>{s.name || s.phone}</option>
                      ))}
                    </select>
                  </div>
                )}

                {terminal ? (
                  <div className={styles.terminal}>
                    {order.status === 'COMPLETED'
                      ? <span className={styles.terminalOk}><CircleCheck size={18} /> {t('admin_status_completed')}</span>
                      : <span className={styles.terminalNo}><XCircle size={18} /> {t('admin_status_cancelled')}</span>}
                    {order.assigned_worker_name && (
                      <span className={styles.courierTag}>· {order.assigned_worker_name}</span>
                    )}
                    <button
                      className={styles.btnView}
                      onClick={() => setDetailId(order.id)}
                      aria-label={lang === 'ru' ? 'Подробнее' : 'Тафсилот'}
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      className={styles.btnDelete}
                      disabled={isBusy}
                      onClick={() => deleteOrder(order.id)}
                      aria-label={lang === 'ru' ? 'Удалить заказ' : 'Заказро нест кардан'}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ) : (
                  <div className={styles.actions}>
                    {order.status === 'NEW' && (
                      <button className={styles.btnAccept} disabled={isBusy}
                        onClick={() => changeStatus(order, 'ACCEPTED')}>
                        <CheckCircle2 size={16} /> {t('ord_mark_accepted')}
                      </button>
                    )}
                    {order.status === 'ACCEPTED' && (
                      <button className={styles.btnDeliver} disabled={isBusy}
                        onClick={() => changeStatus(order, 'DELIVERING')}>
                        <Truck size={16} /> {t('ord_mark_delivering')}
                      </button>
                    )}
                    {order.status === 'DELIVERING' && (
                      <button className={styles.btnComplete} disabled={isBusy}
                        onClick={() => changeStatus(order, 'COMPLETED')}>
                        <CircleCheck size={16} /> {t('ord_mark_completed')}
                      </button>
                    )}
                    <button className={styles.btnCancel} disabled={isBusy}
                      onClick={() => changeStatus(order, 'CANCELLED')}
                      aria-label={t('ord_mark_cancelled')}>
                      <XCircle size={16} /> {t('ord_mark_cancelled')}
                    </button>
                    <button className={styles.btnDelete} disabled={isBusy}
                      onClick={() => deleteOrder(order.id)}
                      aria-label={lang === 'ru' ? 'Удалить заказ' : 'Заказро нест кардан'}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* ---- Detail drill-down modal ---- */}
      {detail && (
        <div className={styles.overlay} onClick={() => setDetailId(null)} role="dialog" aria-modal="true" aria-label={`${t('ord_title')} ${detail.number}`}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div>
                <div className={styles.modalNum}>{detail.number}</div>
                <div className={styles.modalDate}><Clock size={13} /> {formatDate(detail.created_at)}</div>
              </div>
              <span className={`${styles.badge} ${styles['st_' + detail.status]}`}>{statusLabel(detail.status)}</span>
              <button className={styles.modalClose} onClick={() => setDetailId(null)} aria-label={lang === 'ru' ? 'Закрыть' : 'Пӯшидан'}>
                <X size={20} />
              </button>
            </div>

            {/* Timeline */}
            <div className={styles.timeline}>
              {timelineState(detail).map((step, i) => (
                <div
                  key={step.key}
                  className={`${styles.tlStep} ${step.done ? styles.tlDone : ''} ${step.current ? styles.tlCurrent : ''} ${step.cancelled ? styles.tlCancelled : ''}`}
                >
                  <span className={styles.tlDot}>{TIMELINE_ICON[step.key]}</span>
                  <span className={styles.tlLabel}>{statusLabel(step.key)}</span>
                  {i < TIMELINE.length - 1 && <span className={styles.tlBar} />}
                </div>
              ))}
            </div>
            {detail.status === 'CANCELLED' && (
              <div className={styles.cancelNote}><XCircle size={15} /> {t('admin_status_cancelled')}</div>
            )}

            <div className={styles.modalBody}>
              <div className={styles.modalGrid}>
                <div className={styles.mField}>
                  <span className={styles.mLabel}><User size={13} /> {t('ord_customer')}</span>
                  <span className={styles.mVal}>{detail.customer_name}</span>
                </div>
                <div className={styles.mField}>
                  <span className={styles.mLabel}><Phone size={13} /> {lang === 'ru' ? 'Телефон' : 'Телефон'}</span>
                  <a className={styles.mVal} href={`tel:${detail.customer_phone}`}>{detail.customer_phone}</a>
                </div>
                <div className={styles.mField}>
                  <span className={styles.mLabel}><MapPin size={13} /> {t('ord_address')}</span>
                  <span className={styles.mVal}>{addressOf(detail)}</span>
                </div>
                <div className={styles.mField}>
                  <span className={styles.mLabel}><Truck size={13} /> {t('ord_courier')}</span>
                  <span className={styles.mVal}>{detail.assigned_worker_name || t('ord_no_courier')}</span>
                </div>
              </div>

              {detail.notes && <p className={styles.modalNotes}>{detail.notes}</p>}

              <div className={styles.modalItemsHead}>{t('ord_items')}</div>
              <ul className={styles.modalItems}>
                {detail.items.map((it) => (
                  <li key={it.id}>
                    <span>{it.product_name}</span>
                    <span className={styles.tnum}>{it.quantity} × {formatPrice(it.price_at_order)}</span>
                    <strong className={styles.tnum}>{formatPrice(it.subtotal)}</strong>
                  </li>
                ))}
              </ul>

              <div className={styles.modalTotals}>
                {Number(detail.delivery_fee) > 0 && (
                  <div className={styles.mtRow}>
                    <span>{lang === 'ru' ? 'Доставка' : 'Расонидан'}</span>
                    <span className="tnum">{formatPrice(detail.delivery_fee)}</span>
                  </div>
                )}
                <div className={styles.mtRow}>
                  <span>{t('ord_payment')}</span>
                  <span>{detail.payment_method_display}</span>
                </div>
                <div className={`${styles.mtRow} ${styles.mtTotal}`}>
                  <span>{t('ord_total')}</span>
                  <strong className="tnum">{formatPrice(detail.total)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Sub-components ---------------- */

function KpiCard({
  icon, label, value, tone, loading, wide,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone: 'brand' | 'success' | 'warning' | 'info';
  loading: boolean;
  wide?: boolean;
}) {
  return (
    <div className={`${styles.kpi} ${styles['kpi_' + tone]} ${wide ? styles.kpiWide : ''}`}>
      <span className={styles.kpiIcon}>{icon}</span>
      <div className={styles.kpiText}>
        <span className={styles.kpiLabel}>{label}</span>
        {loading
          ? <span className={`skeleton ${styles.kpiSkel}`} />
          : <span className={`${styles.kpiValue} tnum`}>{value}</span>}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className={styles.skCard} aria-hidden="true">
      <div className={styles.skTop}>
        <span className={`skeleton ${styles.skNum}`} />
        <span className={`skeleton ${styles.skBadge}`} />
      </div>
      <span className={`skeleton ${styles.skLine}`} />
      <span className={`skeleton ${styles.skLineSm}`} />
      <span className={`skeleton ${styles.skBlock}`} />
      <div className={styles.skActions}>
        <span className={`skeleton ${styles.skBtn}`} />
        <span className={`skeleton ${styles.skBtn}`} />
      </div>
    </div>
  );
}
