"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { apiClient, mediaUrl } from '@/lib/apiClient';
import {
  Plus, Edit2, Trash2, X, Image as ImageIcon, Upload, Search,
  ArrowUpDown, ArrowUp, ArrowDown, PackageOpen, AlertTriangle,
  RefreshCw, Loader2, CheckCircle2,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import { formatPrice, formatNumber, formatUnit } from '@/lib/format';
import styles from './AdminProducts.module.css';

type Product = {
  id: number;
  slug: string;
  category?: number | string;
  name_tj?: string;
  name_ru?: string;
  sku?: string;
  price?: number | string;
  cost_price?: number | string;
  stock?: number | string;
  unit?: string;
  image?: string | null;
  is_active?: boolean;
  description_tj?: string;
  description_ru?: string;
};

type Category = { id: number; name_tj?: string; name_ru?: string };

type SortKey = 'name' | 'price' | 'stock';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 10;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const EMPTY_FORM = {
  category: '' as number | string,
  name_tj: '',
  name_ru: '',
  sku: '',
  price: '',
  cost_price: '',
  stock: '',
  unit: 'дона',
  description_tj: '',
  description_ru: '',
};

type FormState = typeof EMPTY_FORM;
type FieldErrors = Partial<Record<keyof FormState | 'image', string>>;

export default function AdminProducts() {
  const { lang, t } = useLanguage();
  const toast = useToast();
  const confirm = useConfirm();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Toolbar
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  // Form
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [dragging, setDragging] = useState(false);

  // refs
  const objectUrlRef = useRef<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLSelectElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  /* ------------------------------------------------------------------ */
  /* Data fetching                                                      */
  /* ------------------------------------------------------------------ */
  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    setError(false);
    try {
      const [prodRes, catRes] = await Promise.all([
        apiClient.get(`/products/?page=${page}&page_size=${PAGE_SIZE}`),
        apiClient.get('/categories/'),
      ]);
      const prodData = prodRes.data;
      if (prodData && prodData.results !== undefined) {
        setProducts(prodData.results);
        setTotalItems(prodData.count || 0);
      } else {
        setProducts(prodData || []);
        setTotalItems(prodData?.length || 0);
      }
      setCategories(catRes.data.results || catRes.data || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(currentPage);
  }, [currentPage, fetchData]);

  /* ------------------------------------------------------------------ */
  /* Object URL cleanup                                                 */
  /* ------------------------------------------------------------------ */
  const setPreviewFromFile = useCallback((file: File | null) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (file) {
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      setImagePreview(url);
    } else {
      setImagePreview('');
    }
  }, []);

  useEffect(() => {
    // Revoke any live object URL on unmount.
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  /* ------------------------------------------------------------------ */
  /* Modal open / close                                                 */
  /* ------------------------------------------------------------------ */
  const resetForm = useCallback(() => {
    setErrors({});
    setTouched({});
    setImageFile(null);
    setPreviewFromFile(null);
    setDragging(false);
  }, [setPreviewFromFile]);

  const openAddModal = () => {
    setEditingSlug(null);
    setFormData({
      ...EMPTY_FORM,
      category: categories.length > 0 ? categories[0].id : '',
    });
    resetForm();
    previouslyFocused.current = document.activeElement as HTMLElement;
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingSlug(product.slug);
    setFormData({
      category: product.category ?? '',
      name_tj: product.name_tj || '',
      name_ru: product.name_ru || '',
      sku: product.sku || '',
      price: product.price != null ? String(product.price) : '',
      cost_price: product.cost_price != null ? String(product.cost_price) : '',
      stock: product.stock != null ? String(product.stock) : '',
      unit: product.unit || 'дона',
      description_tj: product.description_tj || '',
      description_ru: product.description_ru || '',
    });
    setErrors({});
    setTouched({});
    setImageFile(null);
    // existing remote image as preview (no object URL to revoke)
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setImagePreview(product.image ? mediaUrl(product.image) : '');
    setDragging(false);
    previouslyFocused.current = document.activeElement as HTMLElement;
    setIsModalOpen(true);
  };

  const closeModal = useCallback(() => {
    if (submitting) return;
    setIsModalOpen(false);
  }, [submitting]);

  // Scroll-lock + Esc + focus management while modal is open.
  useEffect(() => {
    if (!isModalOpen) return;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
        return;
      }
      if (e.key === 'Tab') {
        // focus trap
        const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);

    // focus first field after paint
    const tid = window.setTimeout(() => firstFieldRef.current?.focus(), 60);

    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(tid);
      document.body.style.overflow = '';
    };
  }, [isModalOpen, closeModal]);

  // Restore focus + cleanup preview when modal closes.
  useEffect(() => {
    if (isModalOpen) return;
    resetForm();
    previouslyFocused.current?.focus?.();
  }, [isModalOpen, resetForm]);

  /* ------------------------------------------------------------------ */
  /* Image selection (click + drag/drop)                                */
  /* ------------------------------------------------------------------ */
  const acceptFile = useCallback((file: File | null) => {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrors((p) => ({
        ...p,
        image: lang === 'tj'
          ? 'Танҳо JPG, PNG, WEBP ё GIF иҷозат дода мешавад'
          : 'Разрешены только JPG, PNG, WEBP или GIF',
      }));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setErrors((p) => ({
        ...p,
        image: lang === 'tj'
          ? 'Андозаи расм набояд аз 5 МБ зиёд бошад'
          : 'Размер изображения не должен превышать 5 МБ',
      }));
      return;
    }
    setErrors((p) => ({ ...p, image: undefined }));
    setImageFile(file);
    setPreviewFromFile(file);
  }, [lang, setPreviewFromFile]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    acceptFile(e.target.files?.[0] || null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    acceptFile(e.dataTransfer.files?.[0] || null);
  };

  const removeImage = () => {
    setImageFile(null);
    setPreviewFromFile(null);
    setErrors((p) => ({ ...p, image: undefined }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ------------------------------------------------------------------ */
  /* Validation                                                         */
  /* ------------------------------------------------------------------ */
  const req = (msg: { tj: string; ru: string }) => (lang === 'tj' ? msg.tj : msg.ru);

  const validateField = useCallback((key: keyof FormState, data: FormState): string | undefined => {
    const v = data[key];
    switch (key) {
      case 'category':
        if (!v) return req({ tj: 'Категорияро интихоб кунед', ru: 'Выберите категорию' });
        return undefined;
      case 'name_tj':
        if (!String(v).trim()) return req({ tj: 'Ном ҳатмист', ru: 'Название обязательно' });
        return undefined;
      case 'name_ru':
        if (!String(v).trim()) return req({ tj: 'Ном ҳатмист', ru: 'Название обязательно' });
        return undefined;
      case 'sku':
        if (!String(v).trim()) return req({ tj: 'Артикул ҳатмист', ru: 'Артикул обязателен' });
        return undefined;
      case 'price': {
        const n = parseFloat(String(v));
        if (String(v).trim() === '' || Number.isNaN(n)) return req({ tj: 'Нархро ворид кунед', ru: 'Введите цену' });
        if (n <= 0) return req({ tj: 'Нарх бояд аз 0 зиёд бошад', ru: 'Цена должна быть больше 0' });
        return undefined;
      }
      case 'cost_price': {
        if (String(v).trim() === '') return undefined; // optional
        const n = parseFloat(String(v));
        if (Number.isNaN(n) || n < 0) return req({ tj: 'Арзиши нодуруст', ru: 'Некорректная себестоимость' });
        const price = parseFloat(String(data.price));
        if (!Number.isNaN(price) && n > price) {
          return req({ tj: 'Арзиши аслӣ набояд аз нархи фурӯш зиёд бошад', ru: 'Себестоимость не может превышать цену' });
        }
        return undefined;
      }
      case 'stock': {
        if (String(v).trim() === '') return req({ tj: 'Миқдорро ворид кунед', ru: 'Введите количество' });
        const n = Number(v);
        if (!Number.isInteger(n) || n < 0) return req({ tj: 'Миқдор бояд адади бутуни ≥ 0 бошад', ru: 'Количество — целое число ≥ 0' });
        return undefined;
      }
      default:
        return undefined;
    }
  }, [lang]);

  const validateAll = useCallback((data: FormState): FieldErrors => {
    const keys: (keyof FormState)[] = ['category', 'name_tj', 'name_ru', 'sku', 'price', 'cost_price', 'stock'];
    const next: FieldErrors = {};
    keys.forEach((k) => {
      const msg = validateField(k, data);
      if (msg) next[k] = msg;
    });
    return next;
  }, [validateField]);

  const updateField = (key: keyof FormState, value: string) => {
    const next = { ...formData, [key]: value };
    setFormData(next);
    if (touched[key] || errors[key]) {
      setErrors((prev) => {
        const e = { ...prev, [key]: validateField(key, next) };
        // price changes affect cost_price validity
        if (key === 'price') e.cost_price = validateField('cost_price', next);
        return e;
      });
    }
  };

  const blurField = (key: keyof FormState) => {
    setTouched((p) => ({ ...p, [key]: true }));
    setErrors((prev) => ({ ...prev, [key]: validateField(key, formData) }));
  };

  /* ------------------------------------------------------------------ */
  /* Delete                                                             */
  /* ------------------------------------------------------------------ */
  const handleDelete = async (product: Product) => {
    const name = lang === 'tj' ? product.name_tj : (product.name_ru || product.name_tj);
    const ok = await confirm({
      title: t('admin_confirm_delete'),
      message: name || undefined,
      danger: true,
      confirmText: t('admin_btn_cancel') === 'Отмена' ? 'Удалить' : 'Нест кардан',
      cancelText: t('admin_btn_cancel'),
    });
    if (!ok) return;

    setDeletingSlug(product.slug);
    try {
      await apiClient.delete(`/products/${product.slug}/`);
      toast.success(lang === 'tj' ? 'Маҳсулот нест карда шуд' : 'Товар удалён');
      const isLastItemOnPage = products.length === 1 && currentPage > 1;
      if (isLastItemOnPage) {
        setCurrentPage(currentPage - 1);
      } else {
        fetchData(currentPage);
      }
    } catch {
      toast.error(t('admin_err_delete'));
    } finally {
      setDeletingSlug(null);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Submit                                                             */
  /* ------------------------------------------------------------------ */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const nextErrors = validateAll(formData);
    setErrors((prev) => ({ ...prev, ...nextErrors }));
    setTouched({
      category: true, name_tj: true, name_ru: true, sku: true,
      price: true, cost_price: true, stock: true,
    });
    if (Object.values(nextErrors).some(Boolean)) {
      // focus first invalid field
      const firstKey = (['category', 'name_tj', 'name_ru', 'sku', 'price', 'cost_price', 'stock'] as (keyof FormState)[])
        .find((k) => nextErrors[k]);
      if (firstKey) {
        const el = modalRef.current?.querySelector<HTMLElement>(`[name="${firstKey}"]`);
        el?.focus();
      }
      toast.error(lang === 'tj' ? 'Лутфан хатогиҳоро ислоҳ кунед' : 'Пожалуйста, исправьте ошибки');
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('name_tj', formData.name_tj.trim());
      fd.append('name_ru', formData.name_ru.trim());
      fd.append('sku', formData.sku.trim());
      fd.append('unit', formData.unit);
      fd.append('price', String(parseFloat(formData.price)));
      fd.append('cost_price', formData.cost_price ? String(parseFloat(formData.cost_price)) : '0');
      fd.append('stock', String(parseInt(formData.stock, 10)));
      fd.append('category', String(parseInt(formData.category as string, 10)));
      fd.append('description_tj', formData.description_tj || '');
      fd.append('description_ru', formData.description_ru || '');
      fd.append('is_active', 'true');
      if (imageFile) fd.append('image', imageFile);

      if (editingSlug) {
        await apiClient.patch(`/products/${editingSlug}/`, fd);
      } else {
        await apiClient.post('/products/', fd);
      }

      toast.success(
        editingSlug
          ? (lang === 'tj' ? 'Тағйирот сабт шуд' : 'Изменения сохранены')
          : (lang === 'tj' ? 'Маҳсулот илова шуд' : 'Товар добавлен'),
      );

      setIsModalOpen(false);
      if (!editingSlug && currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchData(currentPage);
      }
    } catch {
      toast.error(t('admin_err_save'));
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Derived: filter + sort (client-side over current page)            */
  /* ------------------------------------------------------------------ */
  const visibleProducts = useMemo(() => {
    let list = [...products];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const hay = `${p.name_tj || ''} ${p.name_ru || ''} ${p.sku || ''}`.toLowerCase();
        return hay.includes(q);
      });
    }
    if (categoryFilter !== 'all') {
      list = list.filter((p) => String(p.category) === categoryFilter);
    }
    if (sortKey) {
      list.sort((a, b) => {
        let av: number | string;
        let bv: number | string;
        if (sortKey === 'name') {
          av = (lang === 'tj' ? a.name_tj : a.name_ru || a.name_tj) || '';
          bv = (lang === 'tj' ? b.name_tj : b.name_ru || b.name_tj) || '';
          const cmp = String(av).localeCompare(String(bv), 'ru');
          return sortDir === 'asc' ? cmp : -cmp;
        }
        av = Number(a[sortKey]) || 0;
        bv = Number(b[sortKey]) || 0;
        return sortDir === 'asc' ? av - bv : bv - av;
      });
    }
    return list;
  }, [products, search, categoryFilter, sortKey, sortDir, lang]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown size={14} className={styles.sortIconIdle} />;
    return sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  const hasFilters = search.trim() !== '' || categoryFilter !== 'all';

  const margin = (p: Product): number | null => {
    const price = Number(p.price);
    const cost = Number(p.cost_price);
    if (!price || !cost || cost <= 0) return null;
    return Math.round(((price - cost) / price) * 100);
  };

  const catName = (id: number | string | undefined) => {
    const c = categories.find((x) => String(x.id) === String(id));
    if (!c) return '';
    return lang === 'tj' ? c.name_tj : c.name_ru;
  };

  /* ------------------------------------------------------------------ */
  /* Render helpers                                                     */
  /* ------------------------------------------------------------------ */
  const stockBadge = (p: Product) => {
    const stock = Number(p.stock) || 0;
    const cls = stock > 10 ? styles.stockGood : stock > 0 ? styles.stockWarn : styles.stockOut;
    return <span className={cls}>{formatNumber(stock)} {formatUnit(p.unit, lang)}</span>;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('admin_prod_title')}</h1>
          {!loading && !error && (
            <p className={styles.subtitle}>
              {lang === 'tj' ? 'Ҳамагӣ' : 'Всего'}: <strong className="tnum">{formatNumber(totalItems)}</strong>
            </p>
          )}
        </div>
        <button className="btn-primary" onClick={openAddModal}>
          <Plus size={20} /> {t('admin_prod_add_btn')}
        </button>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder={lang === 'tj' ? 'Ҷустуҷӯ бо ном ё артикул...' : 'Поиск по названию или артикулу...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={lang === 'tj' ? 'Ҷустуҷӯ' : 'Поиск'}
          />
          {search && (
            <button className={styles.clearSearch} onClick={() => setSearch('')} aria-label="Clear">
              <X size={16} />
            </button>
          )}
        </div>

        <select
          className={styles.filterSelect}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label={t('admin_form_category')}
        >
          <option value="all">{lang === 'tj' ? 'Ҳама категорияҳо' : 'Все категории'}</option>
          {categories.map((cat) => (
            <option key={cat.id} value={String(cat.id)}>
              {lang === 'tj' ? cat.name_tj : cat.name_ru}
            </option>
          ))}
        </select>

        {!loading && !error && (
          <span className={styles.resultCount}>
            {lang === 'tj' ? 'Натиҷа' : 'Результат'}: <strong className="tnum">{formatNumber(visibleProducts.length)}</strong>
          </span>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('admin_prod_table_img')}</th>
                  <th>{t('admin_prod_table_name')}</th>
                  <th>{t('admin_prod_table_sku')}</th>
                  <th>{t('admin_prod_table_price')}</th>
                  <th>{t('admin_prod_table_cost')}</th>
                  <th>{t('admin_prod_table_stock')}</th>
                  <th>{t('admin_prod_table_actions')}</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className={styles.tdImage}><span className={`skeleton ${styles.skThumb}`} /></td>
                    <td><span className={`skeleton ${styles.skLine}`} /></td>
                    <td><span className={`skeleton ${styles.skLineSm}`} /></td>
                    <td><span className={`skeleton ${styles.skLineSm}`} /></td>
                    <td><span className={`skeleton ${styles.skLineSm}`} /></td>
                    <td><span className={`skeleton ${styles.skBadge}`} /></td>
                    <td><span className={`skeleton ${styles.skBtns}`} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.mobileList}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div className={styles.mobileCard} key={i}>
                <span className={`skeleton ${styles.skMobileThumb}`} />
                <div className={styles.mobileCardBody}>
                  <span className={`skeleton ${styles.skLine}`} />
                  <span className={`skeleton ${styles.skLineSm}`} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className={styles.stateBox}>
          <div className={`${styles.stateIcon} ${styles.stateIconError}`}><AlertTriangle size={30} /></div>
          <h3 className={styles.stateTitle}>{lang === 'tj' ? 'Хатогии боргирӣ' : 'Ошибка загрузки'}</h3>
          <p className={styles.stateText}>
            {lang === 'tj' ? 'Маълумотро бор карда натавонистем.' : 'Не удалось загрузить данные.'}
          </p>
          <button className="btn-outline" onClick={() => fetchData(currentPage)}>
            <RefreshCw size={18} /> {lang === 'tj' ? 'Аз нав кӯшиш' : 'Повторить'}
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && visibleProducts.length === 0 && (
        <div className={styles.stateBox}>
          <div className={styles.stateIcon}><PackageOpen size={30} /></div>
          <h3 className={styles.stateTitle}>
            {hasFilters
              ? (lang === 'tj' ? 'Чизе ёфт нашуд' : 'Ничего не найдено')
              : (lang === 'tj' ? 'Ҳоло маҳсулот нест' : 'Пока нет товаров')}
          </h3>
          <p className={styles.stateText}>
            {hasFilters
              ? (lang === 'tj' ? 'Филтрро тағйир диҳед ё дигар калима ҷустуҷӯ кунед.' : 'Измените фильтр или поисковый запрос.')
              : (lang === 'tj' ? 'Аввалин маҳсулоти худро илова кунед.' : 'Добавьте свой первый товар.')}
          </p>
          {hasFilters ? (
            <button className="btn-outline" onClick={() => { setSearch(''); setCategoryFilter('all'); }}>
              {lang === 'tj' ? 'Тоза кардани филтрҳо' : 'Сбросить фильтры'}
            </button>
          ) : (
            <button className="btn-primary" onClick={openAddModal}>
              <Plus size={18} /> {t('admin_prod_add_btn')}
            </button>
          )}
        </div>
      )}

      {/* Data */}
      {!loading && !error && visibleProducts.length > 0 && (
        <>
          {/* Desktop/tablet table */}
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('admin_prod_table_img')}</th>
                  <th>
                    <button className={styles.sortBtn} onClick={() => toggleSort('name')}>
                      {t('admin_prod_table_name')} {sortIcon('name')}
                    </button>
                  </th>
                  <th>{t('admin_prod_table_sku')}</th>
                  <th>
                    <button className={styles.sortBtn} onClick={() => toggleSort('price')}>
                      {t('admin_prod_table_price')} {sortIcon('price')}
                    </button>
                  </th>
                  <th>{t('admin_prod_table_cost')}</th>
                  <th>
                    <button className={styles.sortBtn} onClick={() => toggleSort('stock')}>
                      {t('admin_prod_table_stock')} {sortIcon('stock')}
                    </button>
                  </th>
                  <th>{t('admin_prod_table_actions')}</th>
                </tr>
              </thead>
              <tbody>
                {visibleProducts.map((product) => {
                  const name = lang === 'tj' ? product.name_tj : (product.name_ru || product.name_tj);
                  const m = margin(product);
                  const isDeleting = deletingSlug === product.slug;
                  return (
                    <tr key={product.id} className={product.is_active === false ? styles.rowInactive : ''}>
                      <td className={styles.tdImage}>
                        {product.image ? (
                          <img src={mediaUrl(product.image)} alt="" className={styles.thumb} loading="lazy" />
                        ) : (
                          <div className={styles.thumbPlaceholder}><ImageIcon size={16} /></div>
                        )}
                      </td>
                      <td>
                        <div className={styles.nameCell}>
                          <span className={styles.nameText}>{name}</span>
                          <span className={styles.nameMeta}>
                            {catName(product.category)}
                            {product.is_active === false && (
                              <span className={styles.inactiveTag}>{lang === 'tj' ? 'Ғайрифаъол' : 'Скрыт'}</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className={styles.mono}>{product.sku}</td>
                      <td className={styles.bold}>
                        <span className="tnum">{formatPrice(product.price, 'TJS')}</span>
                      </td>
                      <td className={styles.textGray}>
                        {product.cost_price && Number(product.cost_price) > 0 ? (
                          <span className={styles.costStack}>
                            <span className="tnum">{formatPrice(product.cost_price, 'TJS')}</span>
                            {m != null && <span className={styles.marginTag}>{lang === 'tj' ? 'Фоида' : 'Маржа'} {m}%</span>}
                          </span>
                        ) : '—'}
                      </td>
                      <td>{stockBadge(product)}</td>
                      <td className={styles.actions}>
                        <button
                          className={styles.iconBtnEdit}
                          onClick={() => openEditModal(product)}
                          disabled={isDeleting}
                          aria-label={t('admin_prod_modal_edit')}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          className={styles.iconBtnDelete}
                          onClick={() => handleDelete(product)}
                          disabled={isDeleting}
                          aria-label={t('admin_btn_cancel') === 'Отмена' ? 'Удалить' : 'Нест кардан'}
                        >
                          {isDeleting ? <Loader2 size={18} className={styles.spin} /> : <Trash2 size={18} />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className={styles.mobileList}>
            {visibleProducts.map((product) => {
              const name = lang === 'tj' ? product.name_tj : (product.name_ru || product.name_tj);
              const m = margin(product);
              const isDeleting = deletingSlug === product.slug;
              return (
                <div key={product.id} className={`${styles.mobileCard} ${product.is_active === false ? styles.rowInactive : ''}`}>
                  {product.image ? (
                    <img src={mediaUrl(product.image)} alt="" className={styles.mobileThumb} loading="lazy" />
                  ) : (
                    <div className={styles.mobileThumbEmpty}><ImageIcon size={20} /></div>
                  )}
                  <div className={styles.mobileCardBody}>
                    <div className={styles.mobileCardName}>
                      {name}
                      {product.is_active === false && (
                        <span className={styles.inactiveTag}>{lang === 'tj' ? 'Ғайрифаъол' : 'Скрыт'}</span>
                      )}
                    </div>
                    <div className={styles.mobileCardRow}>
                      <span className={`${styles.mobileCardPrice} tnum`}>{formatPrice(product.price, 'TJS')}</span>
                      {stockBadge(product)}
                    </div>
                    <div className={styles.mobileCardMetaRow}>
                      <span className={styles.mobileCardSku}>{product.sku}</span>
                      {m != null && <span className={styles.marginTag}>{lang === 'tj' ? 'Фоида' : 'Маржа'} {m}%</span>}
                    </div>
                  </div>
                  <div className={styles.mobileCardBtns}>
                    <button
                      className={styles.iconBtnEdit}
                      onClick={() => openEditModal(product)}
                      disabled={isDeleting}
                      aria-label={t('admin_prod_modal_edit')}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className={styles.iconBtnDelete}
                      onClick={() => handleDelete(product)}
                      disabled={isDeleting}
                      aria-label={t('admin_btn_cancel') === 'Отмена' ? 'Удалить' : 'Нест кардан'}
                    >
                      {isDeleting ? <Loader2 size={16} className={styles.spin} /> : <Trash2 size={16} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Pagination (server-side; hidden while filtering a single page makes little sense — kept as-is) */}
      {!loading && !error && totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className={styles.pageBtn}
          >
            {lang === 'tj' ? 'Қаблан' : 'Назад'}
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
            <button
              key={pageNumber}
              onClick={() => setCurrentPage(pageNumber)}
              className={`${styles.pageBtn} ${currentPage === pageNumber ? styles.pageActive : ''}`}
            >
              {pageNumber}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={styles.pageBtn}
          >
            {lang === 'tj' ? 'Баъдӣ' : 'Вперед'}
          </button>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onMouseDown={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div
            className={styles.modal}
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="prod-modal-title"
          >
            <div className={styles.modalHeader}>
              <h2 id="prod-modal-title">{editingSlug ? t('admin_prod_modal_edit') : t('admin_prod_modal_new')}</h2>
              <button className={styles.closeBtn} onClick={closeModal} disabled={submitting} aria-label={t('admin_btn_cancel')}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form} noValidate>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="f-category">{t('admin_form_category')}</label>
                  <select
                    id="f-category"
                    name="category"
                    ref={firstFieldRef}
                    value={formData.category}
                    onChange={(e) => updateField('category', e.target.value)}
                    onBlur={() => blurField('category')}
                    aria-invalid={!!errors.category}
                    aria-describedby={errors.category ? 'err-category' : undefined}
                  >
                    <option value="" disabled>{lang === 'tj' ? 'Интихоб кунед' : 'Выберите'}</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {lang === 'tj' ? cat.name_tj : cat.name_ru}
                      </option>
                    ))}
                  </select>
                  {errors.category && <span className={styles.fieldError} id="err-category">{errors.category}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="f-name_tj">{t('admin_form_name_tj')}</label>
                  <input
                    id="f-name_tj"
                    name="name_tj"
                    type="text"
                    value={formData.name_tj}
                    onChange={(e) => updateField('name_tj', e.target.value)}
                    onBlur={() => blurField('name_tj')}
                    aria-invalid={!!errors.name_tj}
                    aria-describedby={errors.name_tj ? 'err-name_tj' : undefined}
                  />
                  {errors.name_tj && <span className={styles.fieldError} id="err-name_tj">{errors.name_tj}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="f-name_ru">{t('admin_form_name_ru')}</label>
                  <input
                    id="f-name_ru"
                    name="name_ru"
                    type="text"
                    value={formData.name_ru}
                    onChange={(e) => updateField('name_ru', e.target.value)}
                    onBlur={() => blurField('name_ru')}
                    aria-invalid={!!errors.name_ru}
                    aria-describedby={errors.name_ru ? 'err-name_ru' : undefined}
                  />
                  {errors.name_ru && <span className={styles.fieldError} id="err-name_ru">{errors.name_ru}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="f-sku">{t('admin_form_sku')}</label>
                  <input
                    id="f-sku"
                    name="sku"
                    type="text"
                    value={formData.sku}
                    onChange={(e) => updateField('sku', e.target.value)}
                    onBlur={() => blurField('sku')}
                    aria-invalid={!!errors.sku}
                    aria-describedby={errors.sku ? 'err-sku' : undefined}
                  />
                  {errors.sku && <span className={styles.fieldError} id="err-sku">{errors.sku}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="f-unit">{t('admin_form_unit')}</label>
                  <select
                    id="f-unit"
                    name="unit"
                    value={formData.unit}
                    onChange={(e) => updateField('unit', e.target.value)}
                  >
                    <option value="дона">{lang === 'tj' ? 'дона' : 'шт'}</option>
                    <option value="кг">кг</option>
                    <option value="литр">{lang === 'tj' ? 'литр' : 'л'}</option>
                    <option value="метр">{lang === 'tj' ? 'метр' : 'м'}</option>
                    <option value="м2">м2</option>
                    <option value="халта">{lang === 'tj' ? 'халта' : 'мешок'}</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="f-price">{t('admin_form_price')}</label>
                  <input
                    id="f-price"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={formData.price}
                    onChange={(e) => updateField('price', e.target.value)}
                    onBlur={() => blurField('price')}
                    aria-invalid={!!errors.price}
                    aria-describedby={errors.price ? 'err-price' : undefined}
                  />
                  {errors.price && <span className={styles.fieldError} id="err-price">{errors.price}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="f-cost">{t('admin_form_cost')}</label>
                  <input
                    id="f-cost"
                    name="cost_price"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={formData.cost_price}
                    onChange={(e) => updateField('cost_price', e.target.value)}
                    onBlur={() => blurField('cost_price')}
                    aria-invalid={!!errors.cost_price}
                    aria-describedby={errors.cost_price ? 'err-cost_price' : undefined}
                  />
                  {errors.cost_price && <span className={styles.fieldError} id="err-cost_price">{errors.cost_price}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="f-stock">{t('admin_form_stock')}</label>
                  <input
                    id="f-stock"
                    name="stock"
                    type="number"
                    step="1"
                    min="0"
                    inputMode="numeric"
                    value={formData.stock}
                    onChange={(e) => updateField('stock', e.target.value)}
                    onBlur={() => blurField('stock')}
                    aria-invalid={!!errors.stock}
                    aria-describedby={errors.stock ? 'err-stock' : undefined}
                  />
                  {errors.stock && <span className={styles.fieldError} id="err-stock">{errors.stock}</span>}
                </div>
              </div>

              <div className={styles.formGroupFull}>
                <label htmlFor="f-desc-tj">{t('admin_form_desc')} (TJ)</label>
                <textarea
                  id="f-desc-tj"
                  rows={2}
                  value={formData.description_tj}
                  onChange={(e) => updateField('description_tj', e.target.value)}
                />
              </div>

              <div className={styles.formGroupFull}>
                <label htmlFor="f-desc-ru">{t('admin_form_desc')} (RU)</label>
                <textarea
                  id="f-desc-ru"
                  rows={2}
                  value={formData.description_ru}
                  onChange={(e) => updateField('description_ru', e.target.value)}
                />
              </div>

              <div className={styles.formGroupFull}>
                <label>{t('admin_form_image')}</label>
                <div
                  className={`${styles.dropzone} ${dragging ? styles.dropzoneActive : ''} ${errors.image ? styles.dropzoneError : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
                  aria-label={t('admin_form_image_hint')}
                >
                  {imagePreview ? (
                    <div className={styles.previewWrap}>
                      <img src={imagePreview} alt="" className={styles.imagePreview} />
                      <div className={styles.previewBadge}><CheckCircle2 size={14} /> {lang === 'tj' ? 'Расм омода' : 'Готово'}</div>
                      <button
                        type="button"
                        className={styles.removeImageBtn}
                        onClick={(e) => { e.stopPropagation(); removeImage(); }}
                        aria-label={lang === 'tj' ? 'Тоза кардани расм' : 'Удалить изображение'}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className={styles.dropzoneEmpty}>
                      <div className={styles.dropzoneIcon}><Upload size={26} /></div>
                      <div className={styles.dropzoneTitle}>{t('admin_form_image_hint')}</div>
                      <div className={styles.dropzoneHint}>
                        {lang === 'tj'
                          ? 'Расмро ин ҷо кашед ё клик кунед · то 5 МБ'
                          : 'Перетащите файл сюда или нажмите · до 5 МБ'}
                      </div>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleImageChange}
                    hidden
                  />
                </div>
                {errors.image && <span className={styles.fieldError}>{errors.image}</span>}
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={closeModal} disabled={submitting}>
                  {t('admin_btn_cancel')}
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting && <Loader2 size={18} className={styles.spin} />}
                  {editingSlug ? t('admin_btn_save_changes') : t('admin_btn_submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
