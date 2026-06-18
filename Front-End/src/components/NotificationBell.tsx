"use client";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { formatPrice } from '@/lib/format';
import {
  Bell, CheckCircle2, XCircle, User, Clock, ShoppingBag, X, Phone, MapPin,
} from 'lucide-react';
import styles from './NotificationBell.module.css';

type Order = {
  id: number;
  number: string;
  customer_name: string;
  customer_phone: string;
  address_village?: string;
  address_street?: string;
  address_house?: string;
  address_landmark?: string;
  total: string;
  created_at: string;
  items: { id: number; product_name: string; quantity: number }[];
};

const POLL_INTERVAL = 15_000; // 15 seconds

/* ---- Notification sound via Web Audio API ---- */
let audioCtx: AudioContext | null = null;

function playNotificationSound() {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const ctx = audioCtx;

    // Two-tone chime: ascending notes for a pleasant "ding-dong"
    const now = ctx.currentTime;
    const notes = [
      { freq: 880, start: 0, dur: 0.15 },
      { freq: 1174.66, start: 0.18, dur: 0.25 },
    ];

    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.35, now + start);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.05);
    });
  } catch {
    /* Audio not supported — fail silently */
  }
}

export default function NotificationBell() {
  const { t, lang } = useLanguage();
  const toast = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const prevCountRef = useRef(0);
  const bellRef = useRef<HTMLDivElement>(null);

  const fetchPending = useCallback(async () => {
    try {
      const res = await apiClient.get('/orders/pending_today/');
      const data: Order[] = res.data || [];
      // Play sound when new orders appear
      if (data.length > prevCountRef.current && prevCountRef.current >= 0) {
        playNotificationSound();
      }
      prevCountRef.current = data.length;
      setOrders(data);
    } catch {
      /* Silently ignore fetch errors — bell just won't update */
    }
  }, []);

  // Poll every 15s
  useEffect(() => {
    fetchPending();
    const id = setInterval(fetchPending, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchPending]);

  // Close dropdown on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Esc
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const acceptOrder = async (id: number) => {
    setBusyId(id);
    try {
      await apiClient.patch(`/orders/${id}/`, { status: 'ACCEPTED', accepted_via: 'site' });
      setOrders((prev) => prev.filter((o) => o.id !== id));
      prevCountRef.current = Math.max(0, prevCountRef.current - 1);
      toast.success(lang === 'ru' ? 'Заказ принят' : 'Заказ қабул шуд');
    } catch {
      toast.error(lang === 'ru' ? 'Ошибка' : 'Хатогӣ');
    } finally {
      setBusyId(null);
    }
  };

  const rejectOrder = async (id: number) => {
    setBusyId(id);
    try {
      await apiClient.patch(`/orders/${id}/`, { status: 'CANCELLED' });
      setOrders((prev) => prev.filter((o) => o.id !== id));
      prevCountRef.current = Math.max(0, prevCountRef.current - 1);
      toast.success(lang === 'ru' ? 'Заказ отклонён' : 'Заказ рад шуд');
    } catch {
      toast.error(lang === 'ru' ? 'Ошибка' : 'Хатогӣ');
    } finally {
      setBusyId(null);
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString(lang === 'ru' ? 'ru-RU' : 'tg-TJ', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const count = orders.length;

  return (
    <div className={styles.wrapper} ref={bellRef}>
      <button
        className={`${styles.bellBtn} ${count > 0 ? styles.bellActive : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label={t('notif_title')}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Bell size={19} />
        {count > 0 && (
          <span className={styles.badge}>{count > 99 ? '99+' : count}</span>
        )}
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropHeader}>
            <h3 className={styles.dropTitle}>
              <Bell size={16} /> {t('notif_title')}
            </h3>
            <span className={styles.dropToday}>{t('notif_today')}</span>
            <button
              className={styles.dropClose}
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className={styles.dropBody}>
            {count === 0 ? (
              <div className={styles.emptyState}>
                <ShoppingBag size={36} />
                <p>{t('notif_empty')}</p>
              </div>
            ) : (
              orders.map((order) => {
                const isBusy = busyId === order.id;
                const address = [
                  order.address_village,
                  order.address_street,
                  order.address_house
                    ? `${lang === 'ru' ? 'д.' : 'х.'} ${order.address_house}`
                    : '',
                  order.address_landmark,
                ]
                  .map((s) => (s || '').trim())
                  .filter(Boolean)
                  .join(', ');
                return (
                  <div
                    key={order.id}
                    className={`${styles.notifCard} ${isBusy ? styles.notifBusy : ''}`}
                  >
                    <div className={styles.notifTop}>
                      <span className={styles.notifNumber}>{order.number}</span>
                      <span className={styles.notifTime}>
                        <Clock size={12} /> {formatTime(order.created_at)}
                      </span>
                    </div>
                    <div className={styles.notifMeta}>
                      <span className={styles.notifCustomer}>
                        <User size={13} /> {order.customer_name}
                      </span>
                      <span className={styles.notifTotal}>
                        {formatPrice(order.total)}
                      </span>
                    </div>
                    {(order.customer_phone || address) && (
                      <div className={styles.notifContact}>
                        {order.customer_phone && order.customer_phone !== '—' && (
                          <a
                            href={`tel:${order.customer_phone.replace(/[^\d+]/g, '')}`}
                            className={styles.notifPhone}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone size={13} /> {order.customer_phone}
                          </a>
                        )}
                        {address && (
                          <span className={styles.notifAddress}>
                            <MapPin size={13} /> {address}
                          </span>
                        )}
                      </div>
                    )}
                    <div className={styles.notifItems}>
                      {order.items.slice(0, 3).map((it) => (
                        <span key={it.id} className={styles.notifItem}>
                          {it.product_name} ×{it.quantity}
                        </span>
                      ))}
                      {order.items.length > 3 && (
                        <span className={styles.notifMore}>
                          +{order.items.length - 3}
                        </span>
                      )}
                    </div>
                    <div className={styles.notifActions}>
                      <button
                        className={styles.acceptBtn}
                        disabled={isBusy}
                        onClick={() => acceptOrder(order.id)}
                      >
                        <CheckCircle2 size={15} /> {t('notif_accept')}
                      </button>
                      <button
                        className={styles.rejectBtn}
                        disabled={isBusy}
                        onClick={() => rejectOrder(order.id)}
                      >
                        <XCircle size={15} /> {t('notif_reject')}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
