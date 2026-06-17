"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  ShoppingCart, Minus, Plus, ChevronRight, Home, ImageOff, Check,
  Truck, ShieldCheck, Wallet, PackageCheck, Tag, Boxes, Ruler, Hash,
} from 'lucide-react';
import Link from 'next/link';
import { apiClient, mediaUrl } from '@/lib/apiClient';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { formatPrice, formatUnit } from '@/lib/format';
import ProductCard from '@/components/ProductCard';
import Reveal from '@/components/Reveal';
import styles from './Detail.module.css';

export default function ProductDetail() {
  const { id } = useParams();
  const { lang, t } = useLanguage();
  const { addToCart } = useCart();
  const toast = useToast();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  const [related, setRelated] = useState<any[]>([]);

  // Sticky mobile bar visibility — shown once the main buy block scrolls away
  const [showStickyBar, setShowStickyBar] = useState(false);
  const buyRef = useRef<HTMLDivElement | null>(null);

  // Fetch product
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setNotFound(false);
    setImgLoaded(false);
    setImgError(false);
    setActiveImg(0);
    setQty(1);
    apiClient.get(`/products/${id}/`)
      .then(res => { if (alive) setProduct(res.data); })
      .catch(() => { if (alive) setNotFound(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  // Fetch related products (same category, excluding current)
  useEffect(() => {
    if (!product) return;
    let alive = true;
    apiClient.get('/products/?page_size=40')
      .then(res => {
        if (!alive) return;
        const list: any[] = res.data.results || res.data || [];
        const same = list.filter(
          (p) => p.id !== product.id && p.category === product.category
        );
        // Fallback: if a category has no siblings, show other fresh products
        const pool = same.length > 0
          ? same
          : list.filter((p) => p.id !== product.id);
        setRelated(pool.slice(0, 8));
      })
      .catch(() => { if (alive) setRelated([]); });
    return () => { alive = false; };
  }, [product]);

  // Dynamic tab title
  useEffect(() => {
    if (!product) return;
    const name = lang === 'tj' ? product.name_tj : product.name_ru;
    if (name) document.title = `${name} — Barg.tj`;
  }, [product, lang]);

  // Sticky mobile add-to-cart bar via IntersectionObserver on the buy block
  useEffect(() => {
    const el = buyRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { rootMargin: '0px 0px -40% 0px', threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [product]);

  const stock: number = typeof product?.stock === 'number' ? product.stock : 0;
  const lowThreshold: number = typeof product?.low_stock_threshold === 'number'
    ? product.low_stock_threshold : 0;
  const outOfStock = stock <= 0;
  const lowStock = !outOfStock && lowThreshold > 0 && stock <= lowThreshold;

  const unitLabel = formatUnit(product?.unit, lang);

  const dec = useCallback(() => {
    setQty((q) => Math.max(1, q - 1));
  }, []);

  const inc = useCallback(() => {
    setQty((q) => {
      if (q >= stock) {
        toast.info(lang === 'tj'
          ? `Танҳо ${stock} ${unitLabel} дар анбор аст`
          : `В наличии только ${stock} ${unitLabel}`);
        return q;
      }
      return q + 1;
    });
  }, [stock, unitLabel, lang, toast]);

  const handleAdd = useCallback(() => {
    if (!product || outOfStock) return;
    const safeQty = Math.min(Math.max(1, qty), stock);
    addToCart(product, safeQty);
    setAdded(true);
    toast.success(lang === 'tj' ? 'Ба сабад илова шуд' : 'Добавлено в корзину');
    window.setTimeout(() => setAdded(false), 1800);
  }, [product, outOfStock, qty, stock, addToCart, toast, lang]);

  // ===== Loading skeleton (whole page) =====
  if (loading) {
    return (
      <div className={`container ${styles.page}`}>
        <div className={styles.crumbsSkel}>
          <span className={`skeleton ${styles.crumbSkel}`} />
          <span className={`skeleton ${styles.crumbSkel}`} />
          <span className={`skeleton ${styles.crumbSkel}`} />
        </div>
        <div className={styles.grid}>
          <div className={styles.gallery}>
            <div className={`skeleton ${styles.stageSkel}`} />
            <div className={styles.thumbs}>
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className={`skeleton ${styles.thumbSkel}`} />
              ))}
            </div>
          </div>
          <div className={styles.buy}>
            <span className={`skeleton ${styles.lineEyebrow}`} />
            <span className={`skeleton ${styles.lineTitle}`} />
            <span className={`skeleton ${styles.lineTitleShort}`} />
            <span className={`skeleton ${styles.linePrice}`} />
            <span className={`skeleton ${styles.lineChip}`} />
            <span className={`skeleton ${styles.lineActions}`} />
            <div className={styles.trustSkel}>
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className={`skeleton ${styles.lineTrust}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className={`container ${styles.page}`}>
        <div className={styles.notFound}>
          <div className={styles.notFoundIcon}><PackageCheck size={42} /></div>
          <h1>{t('prod_not_found')}</h1>
          <p>{lang === 'tj'
            ? 'Шояд ин маҳсулот фурӯхта шудааст ё нишонӣ нодуруст аст.'
            : 'Возможно, товар распродан или ссылка неверна.'}</p>
          <Link href="/products" className="btn-primary">{t('detail_back')}</Link>
        </div>
      </div>
    );
  }

  const mainName = lang === 'tj' ? product.name_tj : product.name_ru;
  const subName = lang === 'tj' ? product.name_ru : product.name_tj;
  const categoryName = product.category_name;
  const description = lang === 'tj'
    ? (product.description_tj || product.description_ru)
    : (product.description_ru || product.description_tj);

  const hasImage = !!product.image && !imgError;
  // Single image today; gallery is built to gracefully support a future array
  const images: string[] = product.image ? [product.image] : [];

  const trust = [
    {
      icon: <Wallet size={18} />,
      title: lang === 'tj' ? 'Пардохт ҳангоми қабул' : 'Оплата при получении',
      desc: lang === 'tj' ? 'Нақд ё корт' : 'Наличные или карта',
    },
    {
      icon: <Truck size={18} />,
      title: lang === 'tj' ? 'Расонидани зуд' : 'Быстрая доставка',
      desc: lang === 'tj' ? 'То дари хонаатон' : 'До вашего порога',
    },
    {
      icon: <ShieldCheck size={18} />,
      title: lang === 'tj' ? 'Кафолати сифат' : 'Гарантия качества',
      desc: lang === 'tj' ? 'Танҳо моли асил' : 'Только оригинал',
    },
  ];

  const specs = [
    product.sku && { icon: <Hash size={15} />, label: 'SKU', value: product.sku },
    categoryName && { icon: <Tag size={15} />, label: lang === 'tj' ? 'Категория' : 'Категория', value: categoryName },
    { icon: <Ruler size={15} />, label: lang === 'tj' ? 'Воҳид' : 'Ед. изм.', value: unitLabel },
    {
      icon: <Boxes size={15} />,
      label: lang === 'tj' ? 'Мавҷудӣ' : 'Наличие',
      value: outOfStock
        ? (lang === 'tj' ? 'Нест' : 'Нет в наличии')
        : `${stock} ${unitLabel}`,
    },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string }[];

  return (
    <div className={`container ${styles.page}`}>
      {/* ===== Breadcrumbs ===== */}
      <nav className={styles.crumbs} aria-label="breadcrumb">
        <Link href="/" className={styles.crumb}>
          <Home size={14} /> <span>{lang === 'tj' ? 'Асосӣ' : 'Главная'}</span>
        </Link>
        <ChevronRight size={14} className={styles.crumbSep} aria-hidden />
        <Link href="/products" className={styles.crumb}>
          {lang === 'tj' ? 'Каталог' : 'Каталог'}
        </Link>
        {categoryName && (
          <>
            <ChevronRight size={14} className={styles.crumbSep} aria-hidden />
            <Link href="/products" className={styles.crumb}>{categoryName}</Link>
          </>
        )}
        <ChevronRight size={14} className={styles.crumbSep} aria-hidden />
        <span className={styles.crumbCurrent} aria-current="page">{mainName}</span>
      </nav>

      {/* ===== Main two-column ===== */}
      <div className={styles.grid}>
        {/* Left: gallery */}
        <div className={styles.gallery}>
          <div className={styles.stage}>
            {hasImage ? (
              <>
                {!imgLoaded && <div className={`skeleton ${styles.stageSkelAbs}`} />}
                <img
                  src={mediaUrl(images[activeImg])}
                  alt={mainName}
                  className={`${styles.stageImg} ${imgLoaded ? styles.stageImgShown : ''}`}
                  decoding="async"
                  onLoad={() => setImgLoaded(true)}
                  onError={() => setImgError(true)}
                />
              </>
            ) : (
              <div className={styles.noImg}>
                <ImageOff size={40} />
                <span>{t('prod_no_img')}</span>
              </div>
            )}

            <div className={styles.stageBadges}>
              {outOfStock && (
                <span className={`${styles.badge} ${styles.badgeOut}`}>
                  {lang === 'tj' ? 'Тамом шуд' : 'Нет в наличии'}
                </span>
              )}
              {lowStock && (
                <span className={`${styles.badge} ${styles.badgeLow}`}>
                  {lang === 'tj' ? 'Кам мондааст' : 'Заканчивается'}
                </span>
              )}
            </div>
          </div>

          {/* Thumbnail strip — gracefully handles single image */}
          <div className={styles.thumbs}>
            {images.length > 0 ? (
              images.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  className={`${styles.thumb} ${i === activeImg ? styles.thumbActive : ''}`}
                  onClick={() => setActiveImg(i)}
                  aria-label={`${mainName} — ${i + 1}`}
                  aria-pressed={i === activeImg}
                >
                  {!imgError ? (
                    <img src={mediaUrl(src)} alt="" className={styles.thumbImg} loading="lazy" />
                  ) : (
                    <span className={styles.thumbFallback}><ImageOff size={18} /></span>
                  )}
                </button>
              ))
            ) : (
              <span className={`${styles.thumb} ${styles.thumbActive}`}>
                <span className={styles.thumbFallback}><ImageOff size={18} /></span>
              </span>
            )}
          </div>
        </div>

        {/* Right: buy column */}
        <div className={styles.buy} ref={buyRef}>
          {categoryName && <span className={styles.eyebrow}>{categoryName}</span>}
          <h1 className={styles.title}>{mainName}</h1>
          {subName && subName !== mainName && <p className={styles.subName}>{subName}</p>}

          <div className={styles.priceRow}>
            <span className={`${styles.price} tnum`}>{formatPrice(product.price)}</span>
            <span className={styles.priceUnit}>/ {unitLabel}</span>
          </div>

          {/* Stock state */}
          <div className={styles.stockRow}>
            {outOfStock ? (
              <span className={`${styles.stockChip} ${styles.stockOut}`}>
                <span className={styles.dot} /> {t('detail_outstock')}
              </span>
            ) : lowStock ? (
              <span className={`${styles.stockChip} ${styles.stockLow}`}>
                <span className={styles.dot} /> {lang === 'tj'
                  ? `Кам мондааст — ${stock} ${unitLabel}`
                  : `Заканчивается — ${stock} ${unitLabel}`}
              </span>
            ) : (
              <span className={`${styles.stockChip} ${styles.stockIn}`}>
                <span className={styles.dot} /> {t('detail_instock')} {stock} {unitLabel}
              </span>
            )}
          </div>

          {/* Actions */}
          {!outOfStock && (
            <div className={styles.actions}>
              <div className={styles.qty} role="group" aria-label={lang === 'tj' ? 'Миқдор' : 'Количество'}>
                <button
                  type="button"
                  onClick={dec}
                  disabled={qty <= 1}
                  aria-label={lang === 'tj' ? 'Кам кардан' : 'Уменьшить'}
                >
                  <Minus size={18} />
                </button>
                <span className="tnum">{qty}</span>
                <button
                  type="button"
                  onClick={inc}
                  disabled={qty >= stock}
                  aria-label={lang === 'tj' ? 'Зиёд кардан' : 'Увеличить'}
                >
                  <Plus size={18} />
                </button>
              </div>

              <button
                className={`btn-primary ${styles.addBtn} ${added ? styles.addBtnDone : ''}`}
                onClick={handleAdd}
                type="button"
              >
                {added
                  ? <><Check size={20} /> {t('detail_added')}</>
                  : <><ShoppingCart size={20} /> {t('prod_btn_add')}</>}
              </button>
            </div>
          )}

          {outOfStock && (
            <div className={styles.outNote}>
              {lang === 'tj'
                ? 'Ҳоло мавҷуд нест. Дертар санҷед ё бо мо тамос гиред.'
                : 'Сейчас нет в наличии. Загляните позже или свяжитесь с нами.'}
            </div>
          )}

          {/* Trust / delivery signals */}
          <ul className={styles.trust}>
            {trust.map((item, i) => (
              <li key={i} className={styles.trustItem}>
                <span className={styles.trustIcon}>{item.icon}</span>
                <span className={styles.trustText}>
                  <strong>{item.title}</strong>
                  <small>{item.desc}</small>
                </span>
              </li>
            ))}
          </ul>

          {/* Spec block */}
          <dl className={styles.specs}>
            {specs.map((s, i) => (
              <div key={i} className={styles.specRow}>
                <dt className={styles.specLabel}>
                  <span className={styles.specIcon}>{s.icon}</span> {s.label}
                </dt>
                <dd className={styles.specValue}>{s.value}</dd>
              </div>
            ))}
          </dl>

          {/* Description */}
          {description && (
            <div className={styles.description}>
              <h2 className={styles.descTitle}>{lang === 'tj' ? 'Тавсиф' : 'Описание'}</h2>
              <p>{description}</p>
            </div>
          )}
        </div>
      </div>

      {/* ===== Related rail ===== */}
      {related.length > 0 && (
        <section className={styles.related}>
          <Reveal className={styles.relatedHead}>
            <div>
              <span className={styles.relEyebrow}>{lang === 'tj' ? 'Шояд маъқул шавад' : 'Может пригодиться'}</span>
              <h2 className={styles.relTitle}>{lang === 'tj' ? 'Маҳсулоти монанд' : 'Похожие товары'}</h2>
            </div>
            <Link href="/products" className={styles.relViewAll}>
              {t('home_view_all')} <ChevronRight size={16} />
            </Link>
          </Reveal>
          <div className={styles.relRail}>
            {related.map((p) => (
              <div key={p.id} className={styles.relItem}>
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===== Sticky mobile add-to-cart bar ===== */}
      {!outOfStock && (
        <div
          className={`${styles.stickyBar} ${showStickyBar ? styles.stickyBarShown : ''}`}
          aria-hidden={!showStickyBar}
        >
          <div className={styles.stickyInfo}>
            <span className={styles.stickyName}>{mainName}</span>
            <span className={`${styles.stickyPrice} tnum`}>{formatPrice(product.price)}</span>
          </div>
          <button
            className={`btn-primary ${styles.stickyBtn} ${added ? styles.addBtnDone : ''}`}
            onClick={handleAdd}
            type="button"
            tabIndex={showStickyBar ? 0 : -1}
          >
            {added ? <Check size={20} /> : <ShoppingCart size={20} />}
            <span>{added ? t('detail_added') : t('prod_btn_add')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
