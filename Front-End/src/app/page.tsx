"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Truck, ShieldCheck, Phone, ShoppingCart } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { apiClient, mediaUrl, categoryImage } from '@/lib/apiClient';
import styles from './page.module.css';

export default function Home() {
  const { lang, t } = useLanguage();
  const { addToCart } = useCart();
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    apiClient.get('/categories/')
      .then(res => setCategories(res.data.results || res.data || []))
      .catch(console.error);

    apiClient.get('/products/')
      .then(res => setProducts(res.data.results || res.data || []))
      .catch(console.error);
  }, []);

  return (
    <div className={styles.page}>

      {/* === HERO === */}
      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroContent}>
            <div className={styles.heroBadge}>{t('home_badge')}</div>
            <h1 className={styles.heroTitle}>
              {t('home_title_1')}{' '}
              <span className={styles.heroHighlight}>{t('home_title_2')}</span>
            </h1>
            <p className={styles.heroText}>{t('home_desc')}</p>
            <div className={styles.heroButtons}>
              <Link href="/products" className="btn-primary">
                {t('home_btn_explore')} <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* === FEATURES === */}
      <section className={`container ${styles.features}`}>
        <div className={styles.featureCard}>
          <div className={styles.featureIcon}><Truck size={26} /></div>
          <div className={styles.featureBody}>
            <h3>{t('home_feat_1_title')}</h3>
            <p>{t('home_feat_1_desc')}</p>
          </div>
        </div>
        <div className={styles.featureCard}>
          <div className={styles.featureIcon}><ShieldCheck size={26} /></div>
          <div className={styles.featureBody}>
            <h3>{t('home_feat_2_title')}</h3>
            <p>{t('home_feat_2_desc')}</p>
          </div>
        </div>
        <div className={styles.featureCard}>
          <div className={styles.featureIcon}><Phone size={26} /></div>
          <div className={styles.featureBody}>
            <h3>{t('home_feat_3_title')}</h3>
            <p>{t('home_feat_3_desc')}</p>
          </div>
        </div>
      </section>

      {/* === CATEGORIES === */}
      {categories.length > 0 && (
        <section className={`container ${styles.section}`}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{t('home_categories')}</h2>
            <Link href="/products" className={styles.viewAll}>
              {t('home_view_all')} <ArrowRight size={16} />
            </Link>
          </div>
          <div className={styles.catGrid}>
            {categories.map((cat: any) => {
              const catName = lang === 'tj' ? cat.name_tj : cat.name_ru;
              return (
                <Link key={cat.id} href={`/products?category=${cat.slug}`} className={styles.catCard}>
                  <img
                    src={categoryImage(cat.slug)}
                    alt={catName}
                    className={styles.catImg}
                    loading="lazy"
                  />
                  <span className={styles.catOverlay} />
                  <span className={styles.catContent}>
                    <span className={styles.catName}>{catName}</span>
                  </span>
                  <span className={styles.catArrow}><ArrowRight size={16} /></span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* === PRODUCTS === */}
      {products.length > 0 && (
        <section className={`container ${styles.section}`}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{t('home_featured')}</h2>
            <Link href="/products" className={styles.viewAll}>
              {t('home_view_all')} <ArrowRight size={16} />
            </Link>
          </div>
          <div className={styles.prodGrid}>
            {products.slice(0, 8).map((p: any) => {
              const name = lang === 'tj' ? p.name_tj : p.name_ru;
              return (
                <div key={p.id} className={styles.prodCard}>
                  <Link href={`/products/${p.slug}`} className={styles.prodImgLink}>
                    <div className={styles.prodImg}>
                      {p.image ? (
                        <img src={mediaUrl(p.image)} alt={name} loading="lazy" />
                      ) : (
                        <div className={styles.noImg}>{t('prod_no_img')}</div>
                      )}
                    </div>
                  </Link>
                  <div className={styles.prodInfo}>
                    <Link href={`/products/${p.slug}`}>
                      <h3 className={styles.prodName}>{name}</h3>
                    </Link>
                    <div className={styles.prodBottom}>
                      <div className={styles.prodPriceWrap}>
                        <span className={styles.prodPrice}>{p.price} сом.</span>
                        <span className={styles.prodUnit}>/ {p.unit || t('prod_unit_piece')}</span>
                      </div>
                      <button
                        className={styles.prodCartBtn}
                        onClick={() => addToCart(p)}
                        aria-label={t('prod_btn_add')}
                      >
                        <ShoppingCart size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
