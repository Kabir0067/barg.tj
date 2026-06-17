"use client";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { apiClient, mediaUrl } from '@/lib/apiClient';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { formatPrice, formatUnit } from '@/lib/format';
import {
  Search, Plus, Minus, Trash2, ShoppingCart,
  CheckCircle2, Package, Receipt, X, ImageIcon, AlertTriangle, RefreshCw,
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
  image?: string | null;
  category?: number | null;
  category_name?: string;
  low_stock_threshold?: number;
};

type Category = { id: number; name_tj: string; name_ru: string; slug: string };
type SaleItem = Product & { quantity: number };

export default function AdminSale() {
  const { lang, t } = useLanguage();
  const toast = useToast();

  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCat, setActiveCat] = useState<number | 'all'>('all');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cartOpen, setCartOpen] = useState(false); // mobile drawer

  const name = (p: { name_tj: string; name_ru: string }) =>
    lang === 'tj' ? p.name_tj : (p.name_ru || p.name_tj);

  const fetchProducts = useCallback(async (q: string) => {
    setLoading(true);
    setError(false);
    try {
      const res = await apiClient.get('/products/', { params: { search: q, page_size: 100 } });
      setProducts(res.data.results || res.data || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await apiClient.get('/categories/');
      setCategories(res.data.results || res.data || []);
    } catch {
      /* categories are optional for the POS — fail silently, filter just won't render */
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

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
  const clearCart = () => setCart([]);

  const total = cart.reduce((acc, c) => acc + Number(c.price) * c.quantity, 0);
  const cartCount = cart.reduce((acc, c) => acc + c.quantity, 0);

  const confirmSale = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      await apiClient.post('/orders/quick_sale/', {
        items: cart.map((c) => ({ product_id: c.id, quantity: c.quantity })),
      });
      setCart([]);
      setCartOpen(false);
      toast.success(t('sale_success'));
      fetchProducts(query); // навсозии захира
    } catch {
      toast.error(t('admin_err_save'));
    } finally {
      setSubmitting(false);
    }
  };

  /* ---- Category filter (client-side over the fetched page) ---- */
  const visibleProducts = useMemo(() => {
    if (activeCat === 'all') return products;
    return products.filter((p) => p.category === activeCat);
  }, [products, activeCat]);

  const catLabel = (c: Category) => (lang === 'tj' ? c.name_tj : (c.name_ru || c.name_tj));

  const isLowStock = (p: Product) => {
    const threshold = p.low_stock_threshold ?? 5;
    return p.stock > 0 && p.stock <= threshold;
  };

  /* ---------------- Cart panel (shared between desktop aside + mobile drawer) ---------------- */
  const CartPanel = (
    <>
      <div className={styles.cartHead}>
        <h2 className={styles.cartTitle}>
          <ShoppingCart size={20} /> {t('sale_cart_title')}
          {cartCount > 0 && <span className={styles.cartHeadCount}>{cartCount}</span>}
        </h2>
        {cart.length > 0 && (
          <button className={styles.clearBtn} onClick={clearCart} aria-label={t('sale_clear')}>
            <Trash2 size={14} /> {t('sale_clear')}
          </button>
        )}
        <button className={styles.drawerClose} onClick={() => setCartOpen(false)} aria-label={lang === 'ru' ? 'Закрыть' : 'Пӯшидан'}>
          <X size={20} />
        </button>
      </div>

      {cart.length === 0 ? (
        <div className={styles.cartEmpty}>
          <ShoppingCart size={40} />
          <p>{t('sale_cart_empty')}</p>
        </div>
      ) : (
        <div className={styles.cartItems}>
          {cart.map((c) => (
            <div key={c.id} className={styles.cartItem}>
              <div className={styles.ciThumb}>
                {c.image
                  ? <img src={mediaUrl(c.image)} alt="" loading="lazy" />
                  : <span className={styles.ciThumbFallback}><ImageIcon size={16} /></span>}
              </div>
              <div className={styles.ciInfo}>
                <span className={styles.ciName}>{name(c)}</span>
                <span className={`${styles.ciPrice} tnum`}>
                  {formatPrice(c.price)} × {c.quantity} = <strong>{formatPrice(Number(c.price) * c.quantity)}</strong>
                </span>
              </div>
              <div className={styles.ciControls}>
                <button onClick={() => changeQty(c.id, -1)} aria-label={lang === 'ru' ? 'Меньше' : 'Камтар'}><Minus size={15} /></button>
                <span className="tnum">{c.quantity}</span>
                <button onClick={() => changeQty(c.id, 1)} disabled={c.quantity >= c.stock} aria-label={lang === 'ru' ? 'Больше' : 'Бештар'}><Plus size={15} /></button>
                <button className={styles.ciRemove} onClick={() => removeItem(c.id)} aria-label={lang === 'ru' ? 'Удалить' : 'Нест кардан'}><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.cartFooter}>
        <div className={styles.totalRow}>
          <span>{t('sale_total')}</span>
          <strong className="tnum">{formatPrice(total)}</strong>
        </div>
        <button
          className="btn-primary"
          style={{ width: '100%' }}
          disabled={cart.length === 0 || submitting}
          onClick={confirmSale}
        >
          {submitting
            ? <><span className="spinner" aria-hidden="true" /> {lang === 'ru' ? 'Сохранение…' : 'Сабт…'}</>
            : <><CheckCircle2 size={20} /> {t('sale_confirm')}</>}
        </button>
      </div>
    </>
  );

  return (
    <div className={styles.container}>
      {/* Shared page header (matches Orders) */}
      <header className={styles.header}>
        <div className={styles.headLeft}>
          <h1 className={styles.title}><Receipt size={24} /> {t('sale_title')}</h1>
          <p className={styles.subtitle}>{t('sale_subtitle')}</p>
        </div>
      </header>

      <div className={styles.layout}>
        {/* ===== Catalog ===== */}
        <div className={styles.catalog}>
          <div className={styles.searchBox}>
            <Search size={18} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('sale_search')}
              aria-label={t('sale_search')}
            />
            {query && (
              <button className={styles.clearSearch} onClick={() => setQuery('')} aria-label={lang === 'ru' ? 'Очистить' : 'Тоза'}>
                <X size={15} />
              </button>
            )}
          </div>

          {/* Category quick-filter */}
          {categories.length > 0 && (
            <div className={styles.catChips} role="tablist" aria-label={lang === 'ru' ? 'Категории' : 'Категорияҳо'}>
              <button
                role="tab"
                aria-selected={activeCat === 'all'}
                className={`${styles.chip} ${activeCat === 'all' ? styles.chipActive : ''}`}
                onClick={() => setActiveCat('all')}
              >
                {lang === 'ru' ? 'Все' : 'Ҳама'}
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  role="tab"
                  aria-selected={activeCat === c.id}
                  className={`${styles.chip} ${activeCat === c.id ? styles.chipActive : ''}`}
                  onClick={() => setActiveCat(c.id)}
                >
                  {catLabel(c)}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className={styles.productGrid} aria-busy="true">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className={styles.skCard} aria-hidden="true">
                  <span className={`skeleton ${styles.skThumb}`} />
                  <span className={`skeleton ${styles.skLine}`} />
                  <span className={`skeleton ${styles.skLineSm}`} />
                  <span className={`skeleton ${styles.skLineSm}`} />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className={styles.stateBox}>
              <AlertTriangle size={44} className={styles.stateErrIcon} />
              <p>{lang === 'ru' ? 'Не удалось загрузить товары.' : 'Молҳо бор нашуданд.'}</p>
              <button className="btn-primary" onClick={() => fetchProducts(query)}>
                <RefreshCw size={16} /> {lang === 'ru' ? 'Повторить' : 'Аз нав'}
              </button>
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className={styles.stateBox}>
              <Package size={46} className={styles.stateIcon} />
              <p>
                {query.trim() || activeCat !== 'all'
                  ? t('sale_no_results')
                  : (lang === 'ru' ? 'Нет товаров для продажи' : 'Моли барои фурӯш нест')}
              </p>
              {(query.trim() || activeCat !== 'all') && (
                <button className="btn-outline" onClick={() => { setQuery(''); setActiveCat('all'); }}>
                  {lang === 'ru' ? 'Сбросить' : 'Тоза кардан'}
                </button>
              )}
            </div>
          ) : (
            <div className={styles.productGrid}>
              {visibleProducts.map((p) => {
                const remaining = p.stock - inCartQty(p.id);
                const out = remaining <= 0;
                const low = isLowStock(p);
                return (
                  <button
                    key={p.id}
                    className={`${styles.productCard} ${out ? styles.cardOut : ''}`}
                    onClick={() => addToSale(p)}
                    disabled={out}
                  >
                    <span className={styles.pThumb}>
                      {p.image
                        ? <img src={mediaUrl(p.image)} alt="" loading="lazy" />
                        : <span className={styles.pThumbFallback}><ImageIcon size={26} /></span>}
                      {out && <span className={styles.pOutTag}>{t('sale_out')}</span>}
                      {!out && low && <span className={styles.pLowTag}>{t('admin_low_stock')}</span>}
                      {inCartQty(p.id) > 0 && <span className={styles.pInCart}>{inCartQty(p.id)}</span>}
                    </span>
                    <span className={styles.pName}>{name(p)}</span>
                    <span className={styles.pSku}>{p.sku}</span>
                    <span className={styles.pBottom}>
                      <span className={`${styles.pPrice} tnum`}>{formatPrice(p.price)}</span>
                      <span className={out ? styles.pOut : (low ? styles.pLow : styles.pStock)}>
                        {out ? t('sale_out') : `${t('sale_in_stock')}: ${remaining} ${formatUnit(p.unit, lang)}`}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ===== Cart: desktop sticky aside ===== */}
        <aside className={styles.cart}>{CartPanel}</aside>
      </div>

      {/* ===== Mobile sticky checkout bar (always reachable) ===== */}
      <div className={styles.mobileBar}>
        <button
          className={styles.mobileBarBtn}
          onClick={() => setCartOpen(true)}
          disabled={cart.length === 0 && !cartOpen}
        >
          <span className={styles.mbCartIcon}>
            <ShoppingCart size={20} />
            {cartCount > 0 && <span className={styles.mbBadge}>{cartCount}</span>}
          </span>
          <span className={styles.mbLabel}>
            {cart.length === 0
              ? t('sale_cart_empty')
              : `${t('sale_cart_title')} · ${cartCount}`}
          </span>
          <strong className={`${styles.mbTotal} tnum`}>{formatPrice(total)}</strong>
        </button>
      </div>

      {/* ===== Mobile cart drawer (bottom sheet) ===== */}
      {cartOpen && (
        <div className={styles.drawerOverlay} onClick={() => setCartOpen(false)} role="dialog" aria-modal="true" aria-label={t('sale_cart_title')}>
          <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
            {CartPanel}
          </div>
        </div>
      )}
    </div>
  );
}
