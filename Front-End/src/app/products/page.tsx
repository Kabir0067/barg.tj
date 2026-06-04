"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { ShoppingCart, Edit, Plus, X, Trash2, Image, Search, LayoutGrid, Truck, ShieldCheck, Boxes } from 'lucide-react';
import { apiClient, mediaUrl } from '@/lib/apiClient';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './Products.module.css';

export default function ProductsPage() {
  const { addToCart } = useCart();
  const { lang, t } = useLanguage();

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const PAGE_SIZE = 8;

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Modal State for Admin CRUD
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

  // Fetch products with search, category, and pagination
  const fetchProducts = useCallback((search = '', category = '', page = 1) => {
    setLoading(true);
    let query = `page=${page}&page_size=${PAGE_SIZE}&`;
    if (search) query += `search=${encodeURIComponent(search)}&`;
    if (category) query += `category=${encodeURIComponent(category)}&`;

    apiClient.get(`/products/?${query}`)
      .then(res => {
        if (res.data && res.data.results !== undefined) {
          setProducts(res.data.results);
          setTotalItems(res.data.count || 0);
        } else {
          setProducts(res.data || []);
          setTotalItems(res.data?.length || 0);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchProducts(searchQuery, selectedCategory, currentPage);

    apiClient.get('/categories/')
      .then(res => setCategories(res.data.results || res.data || []))
      .catch(console.error);

    // Check admin privileges
    const token = Cookies.get('access_token');
    if (token) {
      apiClient.get('/auth/me/')
        .then(res => {
          if (res.data?.is_staff) {
            setIsAdmin(true);
          }
        })
        .catch(() => setIsAdmin(false));
    }
  }, [fetchProducts, currentPage]);

  // Handle Search Input Change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    setCurrentPage(1);
    fetchProducts(val, selectedCategory, 1);
  };

  // Handle Category Filter Click
  const handleCategorySelect = (categorySlug: string) => {
    setSelectedCategory(categorySlug);
    setCurrentPage(1);
    fetchProducts(searchQuery, categorySlug, 1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormNameTj('');
    setFormNameRu('');
    setFormPrice('');
    setFormCostPrice('');
    setFormSku('');
    setFormStock('');
    setFormThreshold('5');
    setFormUnit(lang === 'tj' ? 'дона' : 'шт');
    setFormCategory(categories[0]?.id || '');
    setFormImage(null);
    setError('');
    setModalOpen(true);
  };

  const openEditModal = (p: any) => {
    setEditingProduct(p);
    setFormNameTj(p.name_tj || '');
    setFormNameRu(p.name_ru || '');
    setFormPrice(p.price || '');
    setFormCostPrice(p.cost_price || '');
    setFormSku(p.sku || '');
    setFormStock(p.stock || '');
    setFormThreshold(p.low_stock_threshold || '5');
    setFormUnit(p.unit || 'дона');
    setFormCategory(p.category || '');
    setFormImage(null);
    setError('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const formData = new FormData();
    formData.append('name_tj', formNameTj);
    formData.append('name_ru', formNameRu);
    formData.append('price', formPrice);
    formData.append('cost_price', formCostPrice);
    formData.append('sku', formSku);
    formData.append('stock', formStock);
    formData.append('low_stock_threshold', formThreshold);
    formData.append('unit', formUnit);
    if (formCategory) {
      formData.append('category', formCategory);
    }
    if (formImage) {
      formData.append('image', formImage);
    }

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
      fetchProducts(searchQuery, selectedCategory);
    } catch (err: any) {
      setError(lang === 'tj' ? 'Хатогӣ дар нигоҳдорӣ. Майдонҳоро дуруст пур кунед.' : 'Ошибка сохранения. Заполните поля корректно.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm(t('prod_admin_delete_confirm'))) return;
    try {
      await apiClient.delete(`/products/${slug}/`);
      fetchProducts(searchQuery, selectedCategory);
    } catch {
      alert(lang === 'tj' ? 'Хатогӣ дар несткунӣ' : 'Ошибка при удалении');
    }
  };

  return (
    <div className={`container ${styles.page}`}>
      
      {/* Catalog Hero Header */}
      <div className={styles.hero}>
        <img src="/hero-products.jpg" alt="" className={styles.heroImg} aria-hidden="true" />
        <span className={styles.heroOverlay} />
        <div className={styles.heroBody}>
          <span className={styles.heroBadge}>{t('prod_hero_badge')}</span>
          <h1 className={styles.heroTitle}>{t('prod_title')}</h1>
          <p className={styles.heroSubtitle}>{t('prod_desc')}</p>

          <div className={styles.heroStats}>
            <span className={styles.heroStat}><Truck size={18} /> {t('prod_hero_delivery')}</span>
            <span className={styles.heroStat}><ShieldCheck size={18} /> {t('prod_hero_quality')}</span>
            {totalItems > 0 && (
              <span className={styles.heroStat}><Boxes size={18} /> {totalItems}+ {t('prod_hero_count')}</span>
            )}
          </div>

          {isAdmin && (
            <button className={`${styles.addProdBtn} btn-primary`} onClick={openAddModal}>
              <Plus size={20} /> {t('prod_admin_add')}
            </button>
          )}
        </div>
      </div>

      {/* Premium Search and Category Filter section */}
      <div className={styles.filterSection}>
        <div className={styles.searchBar}>
          <Search size={20} className={styles.searchIcon} />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={lang === 'tj' ? 'Ҷустуҷӯи маҳсулот...' : 'Поиск товаров...'}
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); fetchProducts('', selectedCategory); }} className={styles.clearSearch}>
              <X size={18} />
            </button>
          )}
        </div>

        {/* Horizontal Scrollable Category Pills */}
        <div className={styles.categoryPills}>
          <button
            className={`${styles.pill} ${selectedCategory === '' ? styles.pillActive : ''}`}
            onClick={() => handleCategorySelect('')}
          >
            <LayoutGrid size={16} />
            <span>{lang === 'tj' ? 'Ҳама маҳсулот' : 'Все товары'}</span>
          </button>
          
          {categories.map((cat: any) => (
            <button
              key={cat.id}
              className={`${styles.pill} ${selectedCategory === cat.slug ? styles.pillActive : ''}`}
              onClick={() => handleCategorySelect(cat.slug)}
            >
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
                      <img src={mediaUrl(p.image)} alt={name} className={styles.img} />
                    ) : (
                      <div className={styles.noImg}>{t('prod_no_img')}</div>
                    )}
                  </Link>
                  {isAdmin && (
                    <div className={styles.adminBadges}>
                      <button className={styles.editBadge} onClick={() => openEditModal(p)} title={t('prod_admin_edit')}>
                        <Edit size={16} />
                      </button>
                      <button className={styles.deleteBadge} onClick={() => handleDelete(p.slug)} title="Нест кардан">
                        <Trash2 size={16} />
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
                      <ShoppingCart size={20} />
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

      {/* Pagination Controls */}
      {Math.ceil(totalItems / PAGE_SIZE) > 1 && (
        <div className={styles.pagination}>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={styles.pageBtn}
          >
            {lang === 'tj' ? 'Қаблан' : 'Назад'}
          </button>
          
          {Array.from({ length: Math.ceil(totalItems / PAGE_SIZE) }, (_, i) => i + 1).map(pageNumber => (
            <button
              key={pageNumber}
              onClick={() => handlePageChange(pageNumber)}
              className={`${styles.pageBtn} ${currentPage === pageNumber ? styles.pageActive : ''}`}
            >
              {pageNumber}
            </button>
          ))}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === Math.ceil(totalItems / PAGE_SIZE)}
            className={styles.pageBtn}
          >
            {lang === 'tj' ? 'Баъдӣ' : 'Вперед'}
          </button>
        </div>
      )}

      {/* Modal Add/Edit */}
      {modalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHead}>
              <h2>{editingProduct ? t('prod_admin_edit') : t('prod_admin_add')}</h2>
              <button onClick={() => setModalOpen(false)} className={styles.modalClose}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} className={styles.modalForm}>
              <div className={styles.modalField}>
                <label>{lang === 'tj' ? 'Номи маҳсулот (Тоҷикӣ)' : 'Название товара (Таджикский)'}</label>
                <input type="text" value={formNameTj} onChange={e => setFormNameTj(e.target.value)} required />
              </div>

              <div className={styles.modalField}>
                <label>{lang === 'tj' ? 'Номи маҳсулот (Русӣ)' : 'Название товара (Русский)'}</label>
                <input type="text" value={formNameRu} onChange={e => setFormNameRu(e.target.value)} required />
              </div>

              <div className={styles.modalRow}>
                <div className={styles.modalField}>
                  <label>{lang === 'tj' ? 'Нархи фурӯш (сомонӣ)' : 'Цена продажи (сомони)'}</label>
                  <input type="number" step="0.01" value={formPrice} onChange={e => setFormPrice(e.target.value)} required />
                </div>
                <div className={styles.modalField}>
                  <label>{lang === 'tj' ? 'Нархи харид (сомонӣ)' : 'Себестоимость (сомони)'}</label>
                  <input type="number" step="0.01" value={formCostPrice} onChange={e => setFormCostPrice(e.target.value)} required />
                </div>
              </div>

              <div className={styles.modalRow}>
                <div className={styles.modalField}>
                  <label>{lang === 'tj' ? 'Артикул (SKU)' : 'Артикул (SKU)'}</label>
                  <input type="text" value={formSku} onChange={e => setFormSku(e.target.value)} required />
                </div>
                <div className={styles.modalField}>
                  <label>{lang === 'tj' ? 'Маҷмӯъ (Миқдор)' : 'Количество на складе'}</label>
                  <input type="number" value={formStock} onChange={e => setFormStock(e.target.value)} required />
                </div>
              </div>

              <div className={styles.modalRow}>
                <div className={styles.modalField}>
                  <label>{lang === 'tj' ? 'Ҳадди ақали захира' : 'Порог низкого запаса'}</label>
                  <input type="number" value={formThreshold} onChange={e => setFormThreshold(e.target.value)} required />
                </div>
                <div className={styles.modalField}>
                  <label>{lang === 'tj' ? 'Воҳиди ченкунӣ' : 'Единица измерения'}</label>
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
                <label>{lang === 'tj' ? 'Расми маҳсулот' : 'Изображение товара'}</label>
                <div className={styles.fileInputWrap}>
                  <Image size={20} />
                  <input type="file" onChange={e => setFormImage(e.target.files?.[0] || null)} accept="image/*" />
                </div>
              </div>

              {error && <div className={styles.modalError}>{error}</div>}

              <div className={styles.modalActions}>
                <button type="button" className="btn-outline" onClick={() => setModalOpen(false)}>{lang === 'tj' ? 'Баргаштан' : 'Отмена'}</button>
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
