"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Truck, ShieldCheck, Phone, Sparkles, PackageCheck, Headphones, Star } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { apiClient, categoryImage } from '@/lib/apiClient';
import ProductCard from '@/components/ProductCard';
import Reveal from '@/components/Reveal';
import styles from './page.module.css';

export default function Home() {
  const { lang, t } = useLanguage();
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      apiClient.get('/categories/').then(r => r.data.results || r.data || []).catch(() => []),
      apiClient.get('/products/').then(r => r.data.results || r.data || []).catch(() => []),
    ]).then(([cats, prods]) => {
      if (!alive) return;
      setCategories(cats);
      setProducts(prods);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  return (
    <div className={styles.page}>

      {/* === HERO === */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden />
        <div className={styles.heroGrid} aria-hidden />
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroContent}>
            <div className={styles.heroBadge}>
              <Sparkles size={15} /> {t('home_badge')}
            </div>
            <h1 className={styles.heroTitle}>
              {t('home_title_1')}{' '}
              <span className={styles.heroHighlight}>{t('home_title_2')}</span>
            </h1>
            <p className={styles.heroText}>{t('home_desc')}</p>
            <div className={styles.heroButtons}>
              <Link href="/products" className={styles.heroPrimary}>
                {t('home_btn_explore')} <ArrowRight size={20} />
              </Link>
              <a href="tel:+992928119002" className={styles.heroSecondary}>
                <Phone size={18} /> {lang === 'tj' ? 'Занг занед' : 'Позвонить'}
              </a>
            </div>
            <div className={styles.heroTrust}>
              <span><PackageCheck size={16} /> {lang === 'tj' ? 'Молҳои асил' : 'Оригинальный товар'}</span>
              <span><Truck size={16} /> {lang === 'tj' ? 'Расонидани зуд' : 'Быстрая доставка'}</span>
              <span><Star size={16} /> {lang === 'tj' ? 'Хизматрасонии 5★' : 'Сервис 5★'}</span>
            </div>
          </div>
          <div className={styles.heroMedia} aria-hidden>
            <div className={styles.heroImageWrap}>
              <img src="/hero-products.jpg" alt="" className={styles.heroImage} />
            </div>
            <div className={styles.heroFloatCard}>
              <span className={styles.heroFloatIcon}><ShieldCheck size={20} /></span>
              <div>
                <strong>{lang === 'tj' ? 'Кафолати сифат' : 'Гарантия качества'}</strong>
                <small>{lang === 'tj' ? 'танҳо моли асил' : 'только оригинал'}</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* === FEATURES === */}
      <section className={`container ${styles.features}`}>
        {[
          { icon: <Truck size={24} />, title: t('home_feat_1_title'), desc: t('home_feat_1_desc') },
          { icon: <ShieldCheck size={24} />, title: t('home_feat_2_title'), desc: t('home_feat_2_desc') },
          { icon: <Headphones size={24} />, title: t('home_feat_3_title'), desc: t('home_feat_3_desc') },
        ].map((f, i) => (
          <Reveal key={i} delay={i * 90} className={styles.featureCard}>
            <div className={styles.featureIcon}>{f.icon}</div>
            <div className={styles.featureBody}>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          </Reveal>
        ))}
      </section>

      {/* === CATEGORIES === */}
      {categories.length > 0 && (
        <section className={`container ${styles.section}`}>
          <Reveal className={styles.sectionHeader}>
            <div>
              <span className={styles.eyebrow}>{lang === 'tj' ? 'Каталог' : 'Каталог'}</span>
              <h2 className={styles.sectionTitle}>{t('home_categories')}</h2>
            </div>
            <Link href="/products" className={styles.viewAll}>
              {t('home_view_all')} <ArrowRight size={16} />
            </Link>
          </Reveal>
          <div className={styles.catGrid}>
            {categories.slice(0, 8).map((cat: any, i: number) => {
              const catName = lang === 'tj' ? cat.name_tj : cat.name_ru;
              return (
                <Reveal key={cat.id} delay={Math.min(i, 7) * 60}>
                  <Link href={`/products?category=${cat.slug}`} className={styles.catCard}>
                    <img src={categoryImage(cat.slug)} alt={catName} className={styles.catImg} loading="lazy" />
                    <span className={styles.catOverlay} />
                    <span className={styles.catContent}>
                      <span className={styles.catName}>{catName}</span>
                    </span>
                    <span className={styles.catArrow}><ArrowRight size={16} /></span>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </section>
      )}

      {/* === FEATURED PRODUCTS === */}
      <section className={`container ${styles.section}`}>
        <Reveal className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>{lang === 'tj' ? 'Тавсия мешавад' : 'Рекомендуем'}</span>
            <h2 className={styles.sectionTitle}>{t('home_featured')}</h2>
          </div>
          <Link href="/products" className={styles.viewAll}>
            {t('home_view_all')} <ArrowRight size={16} />
          </Link>
        </Reveal>

        <div className={styles.prodGrid}>
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={styles.skelCard}>
                  <div className={`${styles.skelImg} skeleton`} />
                  <div className={styles.skelBody}>
                    <div className={`${styles.skelLine} skeleton`} />
                    <div className={`${styles.skelLineShort} skeleton`} />
                  </div>
                </div>
              ))
            : products.slice(0, 8).map((p: any) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* === PROMO CTA === */}
      <section className="container">
        <Reveal className={styles.promo}>
          <div className={styles.promoGlow} aria-hidden />
          <div className={styles.promoContent}>
            <h2>{lang === 'tj' ? 'Лоиҳаи сохтмонӣ доред?' : 'Планируете стройку?'}</h2>
            <p>{lang === 'tj'
              ? 'Ҳама чизи лозимаро дар як ҷо ёбед — бо нархи арзон ва расонидан ба деҳаи шумо.'
              : 'Найдите всё необходимое в одном месте — по выгодной цене и с доставкой в ваше село.'}</p>
          </div>
          <Link href="/products" className={styles.promoBtn}>
            {t('home_btn_explore')} <ArrowRight size={20} />
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
