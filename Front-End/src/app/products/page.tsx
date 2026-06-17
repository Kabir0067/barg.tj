"use client";
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Cookies from 'js-cookie';
import {
  Search, X, SlidersHorizontal, LayoutGrid, Plus, Edit, Trash2,
  Image as ImageIcon, AlertTriangle, RotateCcw, PackageSearch, ChevronLeft, ChevronRight, ArrowDownUp,
  Truck, ShieldCheck, Boxes,
} from 'lucide-react';
import { apiClient, categoryImage } from '@/lib/apiClient';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import ProductCard from '@/components/ProductCard';
import styles from './Products.module.css';

const PAGE_SIZE = 12;
const FETCH_SIZE = 100; // catalog is small — pull the whole active set, filter/sort client-side

type SortKey = 'newest' | 'price_asc' | 'price_desc' | 'name';

function priceNum(p: any): number {
  const n = parseFloat(p?.price);
  return Number.isFinite(n) ? n : 0;
}
function createdMs(p: any): number {
  const t = p?.created_at ? new Date(p.created_at).getTime() : 0;
  return Number.isNaN(t) ? 0 : t;
}

function ProductsCatalog() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang, t } = useLanguage();
  const toast = useToast();
  const confirm = useConfirm();

  // ---- URL-derived state (the URL is the single source of truth) ----
  const urlCategory = searchParams.get('category') || '';
  const urlSearch = searchParams.get('q') || '';
  const urlSort = (searchParams.get('sort') as SortKey) || 'newest';
  const sort: SortKey = ['newest', 'price_asc', 'price_desc', 'name'].includes(urlSort) ? urlSort : 'newest';

  // ---- data ----
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // ---- search input (debounced into the URL) ----
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const isMounted = useRef(false);

  // Write a set of params to the URL (shareable + back-button friendly)
  const updateUrl = useCallback((patch: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([k, v]) => {
      if (v === null || v === '') params.delete(k);
      else params.set(k, v);
    });
    const qs = params.toString();
    router.replace(qs ? `/products?${qs}` : '/products', { scroll: false });
  }, [router, searchParams]);

  // ---- fetch products + categories once ----
  const fetchAll = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    Promise.all([
      apiClient.get(`/products/?page_size=${FETCH_SIZE}`).then(r => r.data.results || r.data || []),
      apiClient.get('/categories/').then(r => r.data.results || r.data || []).catch(() => []),
    ])
      .then(([prods, cats]) => {
        setProducts(Array.isArray(prods) ? prods : []);
        setCategories(Array.isArray(cats) ? cats : []);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAll();
    const token = Cookies.get('access_token');
    if (token) {
      apiClient.get('/auth/me/')
        .then(res => { if (res.data?.is_staff) setIsAdmin(true); })
        .catch(() => {});
    }
  }, [fetchAll]);

  // Keep the search box in sync if the URL changes from outside (e.g. back button)
  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return; }
    setSearchInput(urlSearch);
  }, [urlSearch]);

  // Debounce the search input -> URL (~300ms)
  useEffect(() => {
    if (searchInput === urlSearch) return;
    const id = window.setTimeout(() => {
      updateUrl({ q: searchInput.trim() || null });
    }, 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Reset to page 1 whenever the effective filters change
  useEffect(() => { setPage(1); }, [urlCategory, urlSearch, sort]);

  // The product payload exposes `category` as the category *id* (FK), not a slug.
  // Map the incoming ?category=<slug> to its id so we can filter reliably.
  const activeCategory = categories.find((c: any) => c.slug === urlCategory);

  // ---- derived: filter -> search -> sort ----
  const filtered = useMemo(() => {
    let list = products;

    if (urlCategory) {
      const catId = activeCategory ? String(activeCategory.id) : null;
      list = list.filter((p: any) => {
        // primary: product.category is the FK id; match against the resolved slug→id
        if (catId !== null && String(p.category) === catId) return true;
        // fallbacks for any future payload shape that carries a slug
        return p.category_slug === urlCategory || p.category?.slug === urlCategory;
      });
    }

    const q = urlSearch.trim().toLowerCase();
    if (q) {
      const words = q.split(/\s+/);
      list = list.filter((p: any) => {
        const hay = `${p.name_tj || ''} ${p.name_ru || ''} ${p.sku || ''} ${p.category_name || ''}`.toLowerCase();
        return words.every(w => hay.includes(w));
      });
    }

    const sorted = [...list];
    switch (sort) {
      case 'price_asc': sorted.sort((a, b) => priceNum(a) - priceNum(b)); break;
      case 'price_desc': sorted.sort((a, b) => priceNum(b) - priceNum(a)); break;
      case 'name': sorted.sort((a, b) => {
        const an = (lang === 'tj' ? a.name_tj : a.name_ru) || '';
        const bn = (lang === 'tj' ? b.name_tj : b.name_ru) || '';
        return an.localeCompare(bn, lang === 'tj' ? 'tg' : 'ru');
      }); break;
      default: sorted.sort((a, b) => createdMs(b) - createdMs(a)); // newest
    }
    return sorted;
  }, [products, urlCategory, activeCategory, urlSearch, sort, lang]);

  const totalResults = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const hasFilters = !!urlCategory || !!urlSearch.trim() || sort !== 'newest';

  const sortLabels: Record<SortKey, string> = {
    newest: lang === 'tj' ? 'Навтарин' : 'Сначала новые',
    price_asc: lang === 'tj' ? 'Нарх: арзон → қиммат' : 'Цена: дешевле',
    price_desc: lang === 'tj' ? 'Нарх: қиммат → арзон' : 'Цена: дороже',
    name: lang === 'tj' ? 'Аз рӯи ном (А–Я)' : 'По названию (А–Я)',
  };

  const clearAll = () => {
    setSearchInput('');
    router.replace('/products', { scroll: false });
    setPage(1);
  };

  const selectCategory = (slug: string) => {
    updateUrl({ category: slug || null });
    setMobileFiltersOpen(false);
  };

  const goToPage = (n: number) => {
    const target = Math.min(Math.max(1, n), totalPages);
    setPage(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ---- Admin CRUD modal ----
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formNameTj, setFormNameTj] = useState('');
  const [formNameRu, setFormNameRu] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCostPrice, setFormCostPrice] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formThreshold, setFormThreshold] = useState('5');
  const [formUnit, setFormUnit] = useState('шт');
  const [formCategory, setFormCategory] = useState('');
  const [formImage, setFormImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const openAddModal = () => {
    setEditingProduct(null);
    setFormNameTj(''); setFormNameRu(''); setFormPrice(''); setFormCostPrice('');
    setFormSku(''); setFormStock(''); setFormThreshold('5');
    setFormUnit(lang === 'tj' ? 'дона' : 'шт');
    setFormCategory(categories[0]?.id || '');
    setFormImage(null); setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (p: any) => {
    setEditingProduct(p);
    setFormNameTj(p.name_tj || ''); setFormNameRu(p.name_ru || '');
    setFormPrice(p.price || ''); setFormCostPrice(p.cost_price || '');
    setFormSku(p.sku || ''); setFormStock(p.stock ?? '');
    setFormThreshold(p.low_stock_threshold ?? '5');
    setFormUnit(p.unit || 'дона');
    setFormCategory(p.category || '');
    setFormImage(null); setFormError('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setFormError('');
    const formData = new FormData();
    formData.append('name_tj', formNameTj);
    formData.append('name_ru', formNameRu);
    formData.append('price', formPrice);
    formData.append('cost_price', formCostPrice);
    formData.append('sku', formSku);
    formData.append('stock', formStock);
    formData.append('low_stock_threshold', formThreshold);
    formData.append('unit', formUnit);
    if (formCategory) formData.append('category', formCategory);
    if (formImage) formData.append('image', formImage);

    try {
      if (editingProduct) {
        await apiClient.patch(`/products/${editingProduct.slug}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await apiClient.post('/products/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setModalOpen(false);
      toast.success(lang === 'tj' ? 'Нигоҳ дошта шуд' : 'Сохранено');
      fetchAll();
    } catch {
      setFormError(lang === 'tj'
        ? 'Хатогӣ дар нигоҳдорӣ. Майдонҳоро дуруст пур кунед.'
        : 'Ошибка сохранения. Заполните поля корректно.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: any) => {
    const ok = await confirm({
      title: t('prod_admin_delete_confirm'),
      message: lang === 'tj' ? p.name_tj : p.name_ru,
      danger: true,
      confirmText: lang === 'tj' ? 'Нест кардан' : 'Удалить',
    });
    if (!ok) return;
    try {
      await apiClient.delete(`/products/${p.slug}/`);
      toast.success(lang === 'tj' ? 'Нест карда шуд' : 'Удалено');
      fetchAll();
    } catch {
      toast.error(lang === 'tj' ? 'Хатогӣ дар несткунӣ' : 'Ошибка при удалении');
    }
  };

  // Build a paginator with ellipses
  const pageList = useMemo<(number | '...')[]>(() => {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
      .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
      .reduce<(number | '...')[]>((acc, p, idx, arr) => {
        if (idx > 0 && (arr[idx - 1] as number) < p - 1) acc.push('...');
        acc.push(p);
        return acc;
      }, []);
  }, [totalPages, safePage]);

  return (
    <div className={`container ${styles.page}`}>

      {/* ===== Catalog hero ===== */}
      <section className={styles.hero}>
        <img src="/hero-products.jpg" alt="" className={styles.heroImg} aria-hidden="true" />
        <span className={styles.heroOverlay} aria-hidden />
        <div className={styles.heroBody}>
          <span className={styles.heroBadge}>{t('prod_hero_badge')}</span>
          <h1 className={styles.heroTitle}>{t('prod_title')}</h1>
          <p className={styles.heroSubtitle}>{t('prod_desc')}</p>
          <div className={styles.heroStats}>
            <span className={styles.heroStat}><Truck size={16} /> {t('prod_hero_delivery')}</span>
            <span className={styles.heroStat}><ShieldCheck size={16} /> {t('prod_hero_quality')}</span>
            {!loading && !loadError && (
              <span className={styles.heroStat}><Boxes size={16} /> {products.length}+ {t('prod_hero_count')}</span>
            )}
          </div>
        </div>
        {isAdmin && (
          <button className={styles.heroAddBtn} onClick={openAddModal}>
            <Plus size={18} /> <span>{t('prod_admin_add')}</span>
          </button>
        )}
      </section>

      {/* ===== Toolbar: search + sort + mobile filter trigger ===== */}
      <div className={styles.toolbar}>
        <div className={styles.searchBar}>
          <Search size={18} className={styles.searchIcon} aria-hidden />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={lang === 'tj' ? 'Ҷустуҷӯи маҳсулот…' : 'Поиск товаров…'}
            aria-label={lang === 'tj' ? 'Ҷустуҷӯ' : 'Поиск'}
            className={styles.searchInput}
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className={styles.clearSearch}
              aria-label={lang === 'tj' ? 'Тоза кардан' : 'Очистить'}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className={styles.sortWrap}>
          <ArrowDownUp size={16} className={styles.sortIcon} aria-hidden />
          <select
            className={styles.sortSelect}
            value={sort}
            onChange={(e) => updateUrl({ sort: e.target.value === 'newest' ? null : e.target.value })}
            aria-label={lang === 'tj' ? 'Тартиб' : 'Сортировка'}
          >
            {(Object.keys(sortLabels) as SortKey[]).map(k => (
              <option key={k} value={k}>{sortLabels[k]}</option>
            ))}
          </select>
        </div>

        <button
          className={styles.filterTrigger}
          onClick={() => setMobileFiltersOpen(true)}
          aria-label={lang === 'tj' ? 'Филтрҳо' : 'Фильтры'}
        >
          <SlidersHorizontal size={17} />
          <span>{lang === 'tj' ? 'Категорияҳо' : 'Категории'}</span>
          {urlCategory && <span className={styles.filterDot} />}
        </button>
      </div>

      {/* ===== Category chips (desktop) ===== */}
      <div className={styles.chips}>
        <button
          className={`${styles.chip} ${!urlCategory ? styles.chipActive : ''}`}
          onClick={() => selectCategory('')}
        >
          <LayoutGrid size={15} />
          <span>{lang === 'tj' ? 'Ҳама' : 'Все'}</span>
        </button>
        {categories.map((cat: any) => (
          <button
            key={cat.id}
            className={`${styles.chip} ${urlCategory === cat.slug ? styles.chipActive : ''}`}
            onClick={() => selectCategory(cat.slug)}
          >
            <img src={categoryImage(cat.slug)} className={styles.chipThumb} alt="" aria-hidden />
            <span>{lang === 'tj' ? cat.name_tj : cat.name_ru}</span>
          </button>
        ))}
      </div>

      {/* ===== Result meta + active-filter chips ===== */}
      {!loading && !loadError && (
        <div className={styles.metaRow}>
          <span className={styles.count}>
            <strong className="tnum">{totalResults}</strong>{' '}
            {lang === 'tj' ? 'маҳсулот ёфт шуд' : (totalResults === 1 ? 'товар' : 'товаров')}
          </span>

          {hasFilters && (
            <div className={styles.activeFilters}>
              {urlCategory && activeCategory && (
                <button className={styles.activeChip} onClick={() => selectCategory('')}>
                  {lang === 'tj' ? activeCategory.name_tj : activeCategory.name_ru}
                  <X size={13} />
                </button>
              )}
              {urlSearch.trim() && (
                <button className={styles.activeChip} onClick={() => setSearchInput('')}>
                  “{urlSearch.trim()}”
                  <X size={13} />
                </button>
              )}
              {sort !== 'newest' && (
                <button className={styles.activeChip} onClick={() => updateUrl({ sort: null })}>
                  {sortLabels[sort]}
                  <X size={13} />
                </button>
              )}
              <button className={styles.clearAll} onClick={clearAll}>
                {lang === 'tj' ? 'Тоза кардани ҳама' : 'Сбросить всё'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===== Body: loading / error / empty / grid ===== */}
      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={styles.skelCard}>
              <div className={`${styles.skelImg} skeleton`} />
              <div className={styles.skelBody}>
                <div className={`${styles.skelLine} skeleton`} />
                <div className={`${styles.skelLineShort} skeleton`} />
              </div>
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div className={styles.state}>
          <span className={`${styles.stateIcon} ${styles.stateIconError}`}><AlertTriangle size={30} /></span>
          <h3>{lang === 'tj' ? 'Боргирӣ нашуд' : 'Не удалось загрузить'}</h3>
          <p>{lang === 'tj'
            ? 'Дар пайвастшавӣ ба сервер мушкилӣ ба миён омад.'
            : 'Произошла ошибка при подключении к серверу.'}</p>
          <button className={`btn-primary ${styles.stateBtn}`} onClick={fetchAll}>
            <RotateCcw size={16} /> {lang === 'tj' ? 'Аз нав кӯшиш кунед' : 'Повторить'}
          </button>
        </div>
      ) : pageItems.length > 0 ? (
        <>
          <div className={styles.grid}>
            {pageItems.map((p: any) => (
              <div key={p.id} className={styles.cardWrap}>
                <ProductCard product={p} />
                {isAdmin && (
                  <div className={styles.adminBadges}>
                    <button
                      className={styles.editBadge}
                      onClick={() => openEditModal(p)}
                      aria-label={t('prod_admin_edit')}
                    >
                      <Edit size={15} />
                    </button>
                    <button
                      className={styles.deleteBadge}
                      onClick={() => handleDelete(p)}
                      aria-label={lang === 'tj' ? 'Нест кардан' : 'Удалить'}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() => goToPage(safePage - 1)}
                disabled={safePage === 1}
                className={styles.pageBtn}
                aria-label={lang === 'tj' ? 'Саҳифаи қаблӣ' : 'Предыдущая'}
              >
                <ChevronLeft size={18} />
              </button>
              {pageList.map((item, idx) =>
                item === '...' ? (
                  <span key={`dots-${idx}`} className={styles.pageDots}>…</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => goToPage(item as number)}
                    className={`${styles.pageBtn} ${safePage === item ? styles.pageActive : ''} tnum`}
                  >
                    {item}
                  </button>
                )
              )}
              <button
                onClick={() => goToPage(safePage + 1)}
                disabled={safePage === totalPages}
                className={styles.pageBtn}
                aria-label={lang === 'tj' ? 'Саҳифаи баъдӣ' : 'Следующая'}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className={styles.state}>
          <span className={styles.stateIcon}><PackageSearch size={30} /></span>
          <h3>{t('prod_not_found')}</h3>
          <p>{hasFilters
            ? (lang === 'tj'
              ? 'Бо филтрҳои интихобшуда чизе ёфт нашуд. Филтрҳоро тоза кунед.'
              : 'По выбранным фильтрам ничего не найдено. Попробуйте сбросить фильтры.')
            : (lang === 'tj'
              ? 'Ҳоло ягон маҳсулот нест.'
              : 'Пока нет ни одного товара.')}</p>
          {hasFilters && (
            <button className={`btn-primary ${styles.stateBtn}`} onClick={clearAll}>
              <RotateCcw size={16} /> {lang === 'tj' ? 'Тоза кардани филтрҳо' : 'Сбросить фильтры'}
            </button>
          )}
        </div>
      )}

      {/* ===== Mobile filter sheet ===== */}
      {mobileFiltersOpen && (
        <div
          className={styles.sheetOverlay}
          onClick={() => setMobileFiltersOpen(false)}
          role="presentation"
        >
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className={styles.sheetHandle} aria-hidden />
            <div className={styles.sheetHead}>
              <h2>{lang === 'tj' ? 'Категорияҳо' : 'Категории'}</h2>
              <button onClick={() => setMobileFiltersOpen(false)} className={styles.sheetClose} aria-label="X">
                <X size={20} />
              </button>
            </div>
            <div className={styles.sheetBody}>
              <button
                className={`${styles.sheetItem} ${!urlCategory ? styles.sheetItemActive : ''}`}
                onClick={() => selectCategory('')}
              >
                <LayoutGrid size={18} />
                <span>{lang === 'tj' ? 'Ҳама категорияҳо' : 'Все категории'}</span>
              </button>
              {categories.map((cat: any) => (
                <button
                  key={cat.id}
                  className={`${styles.sheetItem} ${urlCategory === cat.slug ? styles.sheetItemActive : ''}`}
                  onClick={() => selectCategory(cat.slug)}
                >
                  <img src={categoryImage(cat.slug)} className={styles.sheetThumb} alt="" aria-hidden />
                  <span>{lang === 'tj' ? cat.name_tj : cat.name_ru}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== Admin modal ===== */}
      {modalOpen && (
        <div className={styles.modalOverlay} onClick={() => setModalOpen(false)} role="presentation">
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className={styles.modalHead}>
              <h2>{editingProduct ? t('prod_admin_edit') : t('prod_admin_add')}</h2>
              <button onClick={() => setModalOpen(false)} className={styles.modalClose} aria-label="X">
                <X size={22} />
              </button>
            </div>
            <form onSubmit={handleSave} className={styles.modalForm}>
              <div className={styles.modalField}>
                <label>{lang === 'tj' ? 'Номи маҳсулот (Тоҷикӣ)' : 'Название (Таджикский)'}</label>
                <input type="text" value={formNameTj} onChange={e => setFormNameTj(e.target.value)} required />
              </div>
              <div className={styles.modalField}>
                <label>{lang === 'tj' ? 'Номи маҳсулот (Русӣ)' : 'Название (Русский)'}</label>
                <input type="text" value={formNameRu} onChange={e => setFormNameRu(e.target.value)} required />
              </div>
              <div className={styles.modalRow}>
                <div className={styles.modalField}>
                  <label>{lang === 'tj' ? 'Нархи фурӯш' : 'Цена продажи'}</label>
                  <input type="number" step="0.01" value={formPrice} onChange={e => setFormPrice(e.target.value)} required />
                </div>
                <div className={styles.modalField}>
                  <label>{lang === 'tj' ? 'Нархи харид' : 'Себестоимость'}</label>
                  <input type="number" step="0.01" value={formCostPrice} onChange={e => setFormCostPrice(e.target.value)} required />
                </div>
              </div>
              <div className={styles.modalRow}>
                <div className={styles.modalField}>
                  <label>SKU</label>
                  <input type="text" value={formSku} onChange={e => setFormSku(e.target.value)} required />
                </div>
                <div className={styles.modalField}>
                  <label>{lang === 'tj' ? 'Миқдор' : 'Количество'}</label>
                  <input type="number" value={formStock} onChange={e => setFormStock(e.target.value)} required />
                </div>
              </div>
              <div className={styles.modalRow}>
                <div className={styles.modalField}>
                  <label>{lang === 'tj' ? 'Ҳадди ақал' : 'Порог запаса'}</label>
                  <input type="number" value={formThreshold} onChange={e => setFormThreshold(e.target.value)} required />
                </div>
                <div className={styles.modalField}>
                  <label>{lang === 'tj' ? 'Воҳид' : 'Ед. изм.'}</label>
                  <input type="text" value={formUnit} onChange={e => setFormUnit(e.target.value)} required />
                </div>
              </div>
              <div className={styles.modalField}>
                <label>{lang === 'tj' ? 'Категория' : 'Категория'}</label>
                <select value={formCategory} onChange={e => setFormCategory(e.target.value)} required>
                  <option value="">{lang === 'tj' ? 'Интихоб кунед' : 'Выберите'}</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{lang === 'tj' ? c.name_tj : c.name_ru}</option>
                  ))}
                </select>
              </div>
              <div className={styles.modalField}>
                <label>{lang === 'tj' ? 'Расм' : 'Изображение'}</label>
                <div className={styles.fileInputWrap}>
                  <ImageIcon size={18} />
                  <input type="file" onChange={e => setFormImage(e.target.files?.[0] || null)} accept="image/*" />
                </div>
              </div>
              {formError && <div className={styles.modalError}>{formError}</div>}
              <div className={styles.modalActions}>
                <button type="button" className="btn-outline" onClick={() => setModalOpen(false)}>
                  {lang === 'tj' ? 'Баргаштан' : 'Отмена'}
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? '…' : (lang === 'tj' ? 'Сабт кардан' : 'Сохранить')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CatalogFallback() {
  return (
    <div className={`container ${styles.page}`}>
      <div className={`${styles.hero} ${styles.heroSkeleton} skeleton`} />
      <div className={styles.grid}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={styles.skelCard}>
            <div className={`${styles.skelImg} skeleton`} />
            <div className={styles.skelBody}>
              <div className={`${styles.skelLine} skeleton`} />
              <div className={`${styles.skelLineShort} skeleton`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<CatalogFallback />}>
      <ProductsCatalog />
    </Suspense>
  );
}
