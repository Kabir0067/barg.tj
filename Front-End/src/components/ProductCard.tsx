"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Check, ImageOff } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { mediaUrl } from '@/lib/apiClient';
import { formatPrice, formatUnit } from '@/lib/format';
import styles from './ProductCard.module.css';

type Product = {
  id: number;
  slug: string;
  name_tj: string;
  name_ru: string;
  price: string | number;
  image: string | null;
  unit?: string;
  stock?: number;
  low_stock_threshold?: number;
  category_name?: string;
  created_at?: string;
};

function isNew(created_at?: string): boolean {
  if (!created_at) return false;
  const t = new Date(created_at).getTime();
  if (Number.isNaN(t)) return false;
  return (Date.now() - t) < 14 * 24 * 60 * 60 * 1000;
}

export default function ProductCard({ product, showAddLabel = true }: { product: Product; showAddLabel?: boolean }) {
  const { addToCart } = useCart();
  const { lang } = useLanguage();
  const toast = useToast();
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [added, setAdded] = useState(false);

  const name = lang === 'tj' ? product.name_tj : product.name_ru;
  const stock = product.stock;
  const outOfStock = typeof stock === 'number' && stock <= 0;
  const lowStock = !outOfStock && typeof stock === 'number' &&
    typeof product.low_stock_threshold === 'number' && stock <= product.low_stock_threshold;
  const fresh = isNew(product.created_at);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    addToCart(product, 1);
    setAdded(true);
    toast.success(lang === 'tj' ? 'Ба сабад илова шуд' : 'Добавлено в корзину');
    window.setTimeout(() => setAdded(false), 1400);
  };

  return (
    <div className={`${styles.card} ${outOfStock ? styles.isOut : ''}`}>
      <Link href={`/products/${product.slug}`} className={styles.imgLink} aria-label={name}>
        <div className={styles.imgBox}>
          {product.image && !imgError ? (
            <>
              {!imgLoaded && <div className={`${styles.imgSkeleton} skeleton`} />}
              <img
                src={mediaUrl(product.image)}
                alt={name}
                loading="lazy"
                decoding="async"
                className={`${styles.img} ${imgLoaded ? styles.imgShown : ''}`}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
              />
            </>
          ) : (
            <div className={styles.noImg}>
              <ImageOff size={28} />
            </div>
          )}

          <div className={styles.badges}>
            {fresh && <span className={`${styles.badge} ${styles.badgeNew}`}>{lang === 'tj' ? 'Нав' : 'Новинка'}</span>}
            {outOfStock && <span className={`${styles.badge} ${styles.badgeOut}`}>{lang === 'tj' ? 'Тамом шуд' : 'Нет в наличии'}</span>}
            {lowStock && <span className={`${styles.badge} ${styles.badgeLow}`}>{lang === 'tj' ? 'Кам мондааст' : 'Заканчивается'}</span>}
          </div>
        </div>
      </Link>

      <div className={styles.info}>
        {product.category_name && <span className={styles.eyebrow}>{product.category_name}</span>}
        <Link href={`/products/${product.slug}`} className={styles.nameLink}>
          <h3 className={styles.name}>{name}</h3>
        </Link>
        <div className={styles.bottom}>
          <div className={styles.priceWrap}>
            <span className={`${styles.price} tnum`}>{formatPrice(product.price)}</span>
            {product.unit && <span className={styles.unit}>/ {formatUnit(product.unit, lang)}</span>}
          </div>
          <button
            className={`${styles.addBtn} ${added ? styles.addBtnDone : ''} ${showAddLabel ? styles.addBtnWide : ''}`}
            onClick={handleAdd}
            disabled={outOfStock}
            aria-label={lang === 'tj' ? 'Ба сабад' : 'В корзину'}
          >
            {added ? <Check size={17} /> : <ShoppingCart size={17} />}
            {showAddLabel && <span className={styles.addBtnLabel}>{added ? (lang === 'tj' ? 'Илова шуд' : 'Добавлено') : (lang === 'tj' ? 'Ба сабад' : 'В корзину')}</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
