"use client";
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ShoppingCart, Minus, Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { apiClient, mediaUrl } from '@/lib/apiClient';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './Detail.module.css';

export default function ProductDetail() {
  const { id } = useParams();
  const { lang, t } = useLanguage();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    apiClient.get(`/products/${id}/`)
      .then(res => setProduct(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleAdd = () => {
    if (!product) return;
    for (let i = 0; i < qty; i++) addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) return <div className={`container ${styles.page}`}><p>{t('prod_loading')}</p></div>;
  if (!product) return <div className={`container ${styles.page}`}><p>{t('prod_not_found')}</p></div>;

  const mainName = lang === 'tj' ? product.name_tj : product.name_ru;
  const subName = lang === 'tj' ? product.name_ru : product.name_tj;
  const description = lang === 'tj'
    ? (product.description_tj || product.description_ru)
    : (product.description_ru || product.description_tj);

  return (
    <div className={`container ${styles.page}`}>
      <Link href="/products" className={styles.back}><ArrowLeft size={20} /> {t('detail_back')}</Link>

      <div className={styles.grid}>
        <div className={styles.imgWrap}>
          {product.image ? (
            <img src={mediaUrl(product.image)} alt={mainName} className={styles.img} />
          ) : (
            <div className={styles.noImg}>{t('prod_no_img')}</div>
          )}
        </div>

        <div className={styles.info}>
          <h1 className={styles.title}>{mainName}</h1>
          {subName && <p className={styles.ruName}>{subName}</p>}

          <div className={styles.priceBlock}>
            <span className={styles.price}>{product.price} сом.</span>
            <span className={styles.unit}>/ {product.unit || t('prod_unit_piece')}</span>
          </div>

          <div className={styles.stock}>
            {product.stock > 0 ? (
              <span className={styles.inStock}>{t('detail_instock')} {product.stock} {product.unit || t('prod_unit_piece')}</span>
            ) : (
              <span className={styles.outStock}>{t('detail_outstock')}</span>
            )}
          </div>

          {product.stock > 0 && (
            <div className={styles.actions}>
              <div className={styles.qty}>
                <button onClick={() => setQty(Math.max(1, qty - 1))}><Minus size={18} /></button>
                <span>{qty}</span>
                <button onClick={() => setQty(Math.min(product.stock, qty + 1))}><Plus size={18} /></button>
              </div>

              <button className="btn-primary" onClick={handleAdd} style={{flex: 1}}>
                {added ? t('detail_added') : <>{t('prod_btn_add')} <ShoppingCart size={20} /></>}
              </button>
            </div>
          )}

          {description && (
            <div className={styles.description}>
              <p>{description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
