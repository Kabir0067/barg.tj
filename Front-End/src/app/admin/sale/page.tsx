"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useLanguage } from '@/context/LanguageContext';
import {
  Search, Plus, Minus, Trash2, ShoppingCart,
  CheckCircle2, Package, Receipt
} from 'lucide-react';
import styles from './AdminSale.module.css';

type Product = {
  id: number;
  name_tj: string;
  name_ru: string;
  price: string;
  unit: string;
  stock: number;
  sku: string;
};

type SaleItem = Product & { quantity: number };

export default function AdminSale() {
  const { lang, t } = useLanguage();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const name = (p: { name_tj: string; name_ru: string }) =>
    lang === 'tj' ? p.name_tj : (p.name_ru || p.name_tj);

  const fetchProducts = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await apiClient.get('/products/', { params: { search: q, page_size: 100 } });
      setProducts(res.data.results || res.data || []);
    } catch (err) {
      console.error('Product search error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const tmr = setTimeout(() => fetchProducts(query), 300);
    return () => clearTimeout(tmr);
  }, [query, fetchProducts]);

  const inCartQty = (id: number) => cart.find((c) => c.id === id)?.quantity || 0;

  const addToSale = (p: Product) => {
    if (p.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((c) => c.id === p.id);
      if (existing) {
        if (existing.quantity >= p.stock) return prev;
        return prev.map((c) => (c.id === p.id ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [...prev, { ...p, quantity: 1 }];
    });
  };

  const changeQty = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.id !== id) return c;
          const q = Math.min(c.stock, Math.max(0, c.quantity + delta));
          return { ...c, quantity: q };
        })
        .filter((c) => c.quantity > 0)
    );
  };

  const removeItem = (id: number) => setCart((prev) => prev.filter((c) => c.id !== id));

  const total = cart.reduce((acc, c) => acc + Number(c.price) * c.quantity, 0);

  const confirmSale = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      await apiClient.post('/orders/quick_sale/', {
        items: cart.map((c) => ({ product_id: c.id, quantity: c.quantity })),
      });
      setCart([]);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3500);
      fetchProducts(query); // навсозии захира
    } catch (err) {
      console.error('Sale error', err);
      alert(t('admin_err_save'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}><Receipt size={26} /> {t('sale_title')}</h1>
        <p className={styles.subtitle}>{t('sale_subtitle')}</p>
      </div>

      {success && (
        <div className={styles.toast}>
          <CheckCircle2 size={20} /> {t('sale_success')}
        </div>
      )}

      <div className={styles.layout}>
        {/* Каталог */}
        <div className={styles.catalog}>
          <div className={styles.searchBox}>
            <Search size={18} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('sale_search')}
            />
          </div>

          {loading ? (
            <div className={styles.muted}>{t('admin_loading')}</div>
          ) : products.length === 0 ? (
            <div className={styles.muted}>{t('sale_no_results')}</div>
          ) : (
            <div className={styles.productGrid}>
              {products.map((p) => {
                const remaining = p.stock - inCartQty(p.id);
                const out = remaining <= 0;
                return (
                  <button
                    key={p.id}
                    className={`${styles.productCard} ${out ? styles.cardOut : ''}`}
                    onClick={() => addToSale(p)}
                    disabled={out}
                  >
                    <span className={styles.pName}>{name(p)}</span>
                    <span className={styles.pSku}>{p.sku}</span>
                    <span className={styles.pBottom}>
                      <span className={styles.pPrice}>{p.price} TJS</span>
                      <span className={out ? styles.pOut : styles.pStock}>
                        {out ? t('sale_out') : `${t('sale_in_stock')}: ${remaining} ${p.unit}`}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Сабади фурӯш */}
        <aside className={styles.cart}>
          <h2 className={styles.cartTitle}><ShoppingCart size={20} /> {t('sale_cart_title')}</h2>

          {cart.length === 0 ? (
            <div className={styles.cartEmpty}>
              <Package size={40} />
              <p>{t('sale_cart_empty')}</p>
            </div>
          ) : (
            <div className={styles.cartItems}>
              {cart.map((c) => (
                <div key={c.id} className={styles.cartItem}>
                  <div className={styles.ciInfo}>
                    <span className={styles.ciName}>{name(c)}</span>
                    <span className={styles.ciPrice}>{c.price} × {c.quantity} = {(Number(c.price) * c.quantity).toFixed(0)} TJS</span>
                  </div>
                  <div className={styles.ciControls}>
                    <button onClick={() => changeQty(c.id, -1)}><Minus size={15} /></button>
                    <span>{c.quantity}</span>
                    <button onClick={() => changeQty(c.id, 1)} disabled={c.quantity >= c.stock}><Plus size={15} /></button>
                    <button className={styles.ciRemove} onClick={() => removeItem(c.id)}><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className={styles.cartFooter}>
            <div className={styles.totalRow}>
              <span>{t('sale_total')}</span>
              <strong>{total.toFixed(0)} TJS</strong>
            </div>
            <button
              className="btn-primary"
              style={{ width: '100%' }}
              disabled={cart.length === 0 || submitting}
              onClick={confirmSale}
            >
              {submitting ? '...' : <><CheckCircle2 size={20} /> {t('sale_confirm')}</>}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
