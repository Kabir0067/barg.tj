"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { ShoppingCart, Edit, Plus, X, Trash2, Image, Search, LayoutGrid, Truck, ShieldCheck, Boxes } from 'lucide-react';
import { apiClient, mediaUrl, categoryImage } from '@/lib/apiClient';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './Products.module.css';

const PAGE_SIZE = 12;

export default function ProductsPage() {
  const { addToCart } = useCart();
  const { lang, t } = useLanguage();

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  // null = not yet initialized from URL (prevents double-fetch on mount)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Admin CRUD modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formNameTj, setFormNameTj] = useState('');
  const [formNameRu, setFormNameRu] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCostPrice, setFormCostPrice] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formThreshold, setFormThreshold] = useState('');
  const [formUnit, setFormUnit] = useState('шт');
  const [formCategory, setFormCategory] = useState('');
  const [formImage, setFormImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchProducts = useCallback((search: string, category: string, page: number) => {
    setLoading(true);
    let query = `page=${page}&page_size=${PAGE_SIZE}`;
    if (search) query += `&search=${encodeURIComponent(search)}`;
    if (category) query += `&category=${encodeURIComponent(category)}`;

    apiClient.get(`/products/?${query}`)
      .then(res => {
        setProducts(res.data.results || res.data || []);
        setTotalItems(res.data.count || res.data?.length || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Mount: read URL params, fetch categories, check admin
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSelectedCategory(params.get('category') || '');

    apiClient.get('/categories/')
      .then(res => setCategories(res.data.results || res.data || []))
      .catch(console.error);

    const token = Cookies.get('access_token');
    if (token) {
      apiClient.get('/auth/me/')
        .then(res => { if (res.data?.is_staff) setIsAdmin(true); })
        .catch(() => {});
    }
  }, []);

  // Fetch products whenever filters or page changes (after initialization)
  useEffect(() => {
    if (selectedCategory === null) return;
    fetchProducts(searchQuery, selectedCategory, currentPage);
  }, [fetchProducts, searchQuery, selectedCategory, currentPage]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleCategorySelect = (slug: string) => {
    setSelectedCategory(slug);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    const maxPage = Math.ceil(totalItems / PAGE_SIZE);
    if (newPage < 1 || newPage > maxPage) return;
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormNameTj(''); setFormNameRu(''); setFormPrice(''); setFormCostPrice('');
    setFormSku(''); setFormStock(''); setFormThreshold('5');
    setFormUnit(lang === 'tj' ? 'дона' : 'шт');
    setFormCategory(categories[0]?.id || '');
    setFormImage(null); setError('');
    setModalOpen(true);
  };

  const openEditModal = (p: any) => {
    setEditingProduct(p);
    setFormNameTj(p.name_tj || ''); setFormNameRu(p.name_ru || '');
    setFormPrice(p.price || ''); setFormCostPrice(p.cost_price || '');
    setFormSku(p.sku || ''); setFormStock(p.stock || '');
    setFormThreshold(p.low_stock_threshold || '5');
    setFormUnit(p.unit || 'дона');
    setFormCategory(p.category || '');
    setFormImage(null); setError('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
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
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await apiClient.post('/products/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      setModalOpen(false);
      fetchProducts(searchQuery, selectedCategory || '', currentPage);
    } catch {
      setError(lang === 'tj' ? 'Хатогӣ дар нигоҳдорӣ. Майдонҳоро дуруст пур кунед.' : 'Ошибка сохранения. Заполните поля корректно.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm(t('prod_admin_delete_confirm'))) return;
    try {
      await apiClient.delete(`/products/${slug}/`);
      fetchProducts(searchQuery, selectedCategory || '', currentPage);
    } catch {
      alert(lang === 'tj' ? 'Хатогӣ дар несткунӣ' : 'Ошибка при удалении');
    }
  };

  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  return (
    <div className={`container ${styles.page}`}>

      {/* Catalog Hero */}
      <div className={styles.hero}>
        <img src="/hero-products.jpg" alt="" className={styles.heroImg} aria-hidden="true" />
        <span className={styles.heroOverlay} />
        <div className={styles.heroBody}>
          <span className={styles.heroBadge}>{t('prod_hero_badge')}</span>
          <h1 className={styles.heroTitle}>{t('prod_title')}</h1>
          <p className={styles.heroSubtitle}>{t('prod_desc')}</p>
          <div className={styles.heroStats}>
            <span className={styles.heroStat}><Truck size={16} /> {t('prod_hero_delivery')}</span>
            <span className={styles.heroStat}><ShieldCheck size={16} /> {t('prod_hero_quality')}</span>
            {totalItems > 0 && (
              <span className={styles.heroStat}><Boxes size={16} /> {totalItems}+ {t('prod_hero_count')}</span>
            )}
          </div>
          {isAdmin && (
            <button className={`${styles.addProdBtn} btn-primary`} onClick={openAddModal}>
              <Plus size={18} /> {t('prod_admin_add')}
            </button>
          )}
        </div>
      </div>

      {/* Search + Category Filter */}
      <div className={styles.filterSection}>
        <div className={styles.searchBar}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={lang === 'tj' ? 'Ҷустуҷӯи маҳсулот...' : 'Поиск товаров...'}
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setCurrentPage(1); }} className={styles.clearSearch}>
              <X size={16} />
            </button>
          )}
        </div>

        <div className={styles.categoryPills}>
          <button
            className={`${styles.pill} ${selectedCategory === '' ? styles.pillActive : ''}`}
            onClick={() => handleCategorySelect('')}
          >
            <LayoutGrid size={15} />
            <span>{lang === 'tj' ? 'Ҳама' : 'Все'}</span>
          </button>

          {categories.map((cat: any) => (
            <button
              key={cat.id}
              className={`${styles.pill} ${selectedCategory === cat.slug ? styles.pillActive : ''}`}
              onClick={() => handleCategorySelect(cat.slug)}
            >
              <img src={categoryImage(cat.slug)} className={styles.pillThumb} alt="" />
              <span>{lang === 'tj' ? cat.name_tj : cat.name_ru}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>{t('prod_loading')}</p>
        </div>
      ) : products.length > 0 ? (
        <div className={styles.grid}>
          {products.map(p => {
            const name = lang === 'tj' ? p.name_tj : p.name_ru;
            return (
              <div key={p.id} className={styles.card}>
                <div className={styles.imgContainer}>
                  <Link href={`/products/${p.slug}`} className={styles.imgWrap}>
                    {p.image ? (
                      <img src={mediaUrl(p.image)} alt={name} className={styles.img} loading="lazy" />
                    ) : (
                      <div className={styles.noImg}>{t('prod_no_img')}</div>
                    )}
                  </Link>
                  {isAdmin && (
                    <div className={styles.adminBadges}>
                      <button className={styles.editBadge} onClick={() => openEditModal(p)}>
                        <Edit size={15} />
                      </button>
                      <button className={styles.deleteBadge} onClick={() => handleDelete(p.slug)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
                <div className={styles.info}>
                  <Link href={`/products/${p.slug}`}>
                    <h3 className={styles.name}>{name}</h3>
                  </Link>
                  <div className={styles.bottom}>
                    <div>
                      <span className={styles.price}>{p.price} сом.</span>
                      <span className={styles.unit}>/ {p.unit || t('prod_unit_piece')}</span>
                    </div>
                    <button className={styles.addBtn} onClick={() => addToCart(p)} aria-label={t('prod_btn_add')}>
                      <ShoppingCart size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.empty}>
          <h3>{t('prod_not_found')}</h3>
          <p>{lang === 'tj' ? 'Лутфан калимаи ҷустуҷӯро тағйир диҳед.' : 'Пожалуйста, попробуйте изменить поисковый запрос.'}</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={styles.pageBtn}
            aria-label="Саҳифаи қаблӣ"
          >
            ‹
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
            .reduce<(number | '...')[]>((acc, p, idx, arr) => {
              if (idx > 0 && (arr[idx - 1] as number) < p - 1) acc.push('...');
              acc.push(p);
              return acc;
            }, [])
            .map((item, idx) =>
              item === '...' ? (
                <span key={`dots-${idx}`} className={styles.pageDots}>…</span>
              ) : (
                <button
                  key={item}
                  onClick={() => handlePageChange(item as number)}
                  className={`${styles.pageBtn} ${currentPage === item ? styles.pageActive : ''}`}
                >
                  {item}
                </button>
              )
            )}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={styles.pageBtn}
            aria-label="Саҳифаи баъдӣ"
          >
            ›
          </button>
        </div>
      )}

      {/* Admin Modal */}
      {modalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHead}>
              <h2>{editingProduct ? t('prod_admin_edit') : t('prod_admin_add')}</h2>
              <button onClick={() => setModalOpen(false)} className={styles.modalClose}>
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
                  <Image size={18} />
                  <input type="file" onChange={e => setFormImage(e.target.files?.[0] || null)} accept="image/*" />
                </div>
              </div>
              {error && <div className={styles.modalError}>{error}</div>}
              <div className={styles.modalActions}>
                <button type="button" className="btn-outline" onClick={() => setModalOpen(false)}>
                  {lang === 'tj' ? 'Баргаштан' : 'Отмена'}
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? '...' : (lang === 'tj' ? 'Сабт кардан' : 'Сохранить')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
