"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useLanguage } from '@/context/LanguageContext';
import {
  Package, Phone, MapPin, Clock, Truck, CheckCircle2,
  XCircle, CircleCheck, User, RefreshCw, Trash2
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

export default function AdminOrders() {
  const { t, lang } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [busyId, setBusyId] = useState<number | null>(null);

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
    try {
      const [oRes, sRes] = await Promise.all([
        apiClient.get('/orders/'),
        apiClient.get('/staff/'),
      ]);
      setOrders(oRes.data.results || oRes.data || []);
      setStaff(sRes.data.results || sRes.data || []);
    } catch (err) {
      console.error('Orders fetch error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const patchOrder = async (id: number, payload: Record<string, unknown>) => {
    setBusyId(id);
    try {
      const res = await apiClient.patch(`/orders/${id}/`, payload);
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...res.data } : o)));
    } catch (err) {
      console.error('Order update error', err);
    } finally {
      setBusyId(null);
    }
  };

  const changeStatus = (order: Order, status: string) => {
    if (status === 'CANCELLED' && !window.confirm(t('ord_confirm_cancel'))) return;
    patchOrder(order.id, { status });
  };

  const assignCourier = (order: Order, workerId: string) => {
    patchOrder(order.id, { assigned_worker: workerId ? Number(workerId) : null });
  };

  const deleteOrder = async (id: number) => {
    if (!window.confirm(lang === 'ru' ? 'Удалить этот заказ навсегда?' : 'Ин заказро пок кунед?')) return;
    setBusyId(id);
    try {
      await apiClient.delete(`/orders/${id}/`);
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } catch (err) {
      console.error('Delete order error', err);
    } finally {
      setBusyId(null);
    }
  };

  const visible = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const countFor = (s: string) =>
    s === 'all' ? orders.length : orders.filter((o) => o.status === s).length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('ord_title')}</h1>
          <p className={styles.subtitle}>{t('ord_subtitle')}</p>
        </div>
        <button className={styles.refreshBtn} onClick={fetchOrders} title="↻">
          <RefreshCw size={18} />
        </button>
      </div>

      <div className={styles.tabs}>
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            className={`${styles.tab} ${filter === s ? styles.tabActive : ''}`}
            onClick={() => setFilter(s)}
          >
            {s === 'all' ? t('ord_filter_all') : statusLabel(s)}
            <span className={styles.tabCount}>{countFor(s)}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loading}>{t('admin_loading')}</div>
      ) : visible.length === 0 ? (
        <div className={styles.empty}>
          <Package size={48} />
          <p>{t('ord_empty')}</p>
        </div>
      ) : (
        <div className={styles.list}>
          {visible.map((order) => (
            <div key={order.id} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.orderNumber}>{order.number}</span>
                <span className={`${styles.badge} ${styles['st_' + order.status]}`}>
                  {statusLabel(order.status)}
                </span>
              </div>

              <div className={styles.meta}>
                <span><User size={14} /> {order.customer_name}</span>
                <a href={`tel:${order.customer_phone}`}><Phone size={14} /> {order.customer_phone}</a>
                <span><Clock size={14} /> {formatDate(order.created_at)}</span>
              </div>

              <div className={styles.address}>
                <MapPin size={14} />
                <span>
                  {order.address_village}
                  {order.address_street ? `, ${order.address_street}` : ''}
                  {order.address_house ? `, ${order.address_house}` : ''}
                  {order.address_landmark ? ` — ${order.address_landmark}` : ''}
                </span>
              </div>

              <ul className={styles.items}>
                {order.items.map((it) => (
                  <li key={it.id}>
                    <span>{it.product_name}</span>
                    <span className={styles.itemQty}>{it.quantity} × {it.price_at_order}</span>
                  </li>
                ))}
              </ul>

              {order.notes && <p className={styles.notes}>📝 {order.notes}</p>}

              <div className={styles.totals}>
                <span>{t('ord_payment')}: <strong>{order.payment_method_display}</strong></span>
                <span className={styles.total}>{t('ord_total')}: <strong>{order.total} TJS</strong></span>
              </div>

              {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                <div className={styles.courierRow}>
                  <Truck size={16} />
                  <select
                    value={order.assigned_worker ?? ''}
                    onChange={(e) => assignCourier(order, e.target.value)}
                    disabled={busyId === order.id}
                  >
                    <option value="">{t('ord_no_courier')}</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>{s.name || s.phone}</option>
                    ))}
                  </select>
                </div>
              )}

              {(order.status === 'COMPLETED' || order.status === 'CANCELLED') ? (
                <div className={styles.terminal}>
                  {order.status === 'COMPLETED'
                    ? <><CircleCheck size={18} /> {t('admin_status_completed')}</>
                    : <><XCircle size={18} /> {t('admin_status_cancelled')}</>}
                  {order.assigned_worker_name && (
                    <span className={styles.courierTag}>· {order.assigned_worker_name}</span>
                  )}
                  <button className={styles.btnDelete} disabled={busyId === order.id}
                    onClick={() => deleteOrder(order.id)} title={lang === 'ru' ? 'Удалить' : 'Нест кардан'}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ) : (
                <div className={styles.actions}>
                  {order.status === 'NEW' && (
                    <button className={styles.btnAccept} disabled={busyId === order.id}
                      onClick={() => changeStatus(order, 'ACCEPTED')}>
                      <CheckCircle2 size={16} /> {t('ord_mark_accepted')}
                    </button>
                  )}
                  {order.status === 'ACCEPTED' && (
                    <button className={styles.btnDeliver} disabled={busyId === order.id}
                      onClick={() => changeStatus(order, 'DELIVERING')}>
                      <Truck size={16} /> {t('ord_mark_delivering')}
                    </button>
                  )}
                  {order.status === 'DELIVERING' && (
                    <button className={styles.btnComplete} disabled={busyId === order.id}
                      onClick={() => changeStatus(order, 'COMPLETED')}>
                      <CircleCheck size={16} /> {t('ord_mark_completed')}
                    </button>
                  )}
                  <button className={styles.btnCancel} disabled={busyId === order.id}
                    onClick={() => changeStatus(order, 'CANCELLED')}>
                    <XCircle size={16} /> {t('ord_mark_cancelled')}
                  </button>
                  <button className={styles.btnDelete} disabled={busyId === order.id}
                    onClick={() => deleteOrder(order.id)} title={lang === 'ru' ? 'Удалить' : 'Нест кардан'}>
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
