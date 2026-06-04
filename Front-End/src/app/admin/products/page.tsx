"use client";
import React, { useState, useEffect } from 'react';
import { apiClient, mediaUrl } from '@/lib/apiClient';
import { Plus, Edit2, Trash2, X, Image as ImageIcon, Upload } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import styles from './AdminProducts.module.css';

export default function AdminProducts() {
  const { lang, t } = useLanguage();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const PAGE_SIZE = 10;
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    category: '',
    name_tj: '',
    name_ru: '',
    sku: '',
    price: '',
    cost_price: '',
    stock: '',
    unit: 'дона',
    description_tj: '',
    description_ru: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    fetchData(currentPage);
  }, [currentPage]);

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        apiClient.get(`/products/?page=${page}&page_size=${PAGE_SIZE}`),
        apiClient.get('/categories/')
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
    } catch (err) {
      console.error("Fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingSlug(null);
    setFormData({
      category: categories.length > 0 ? categories[0].id : '',
      name_tj: '',
      name_ru: '',
      sku: '',
      price: '',
      cost_price: '',
      stock: '',
      unit: 'дона',
      description_tj: '',
      description_ru: ''
    });
    setImageFile(null);
    setImagePreview('');
    setIsModalOpen(true);
  };

  const openEditModal = (product: any) => {
    setEditingSlug(product.slug);
    setFormData({
      category: product.category || '',
      name_tj: product.name_tj || '',
      name_ru: product.name_ru || '',
      sku: product.sku || '',
      price: product.price || '',
      cost_price: product.cost_price || '',
      stock: product.stock || '',
      unit: product.unit || 'дона',
      description_tj: product.description_tj || '',
      description_ru: product.description_ru || ''
    });
    setImageFile(null);
    setImagePreview(mediaUrl(product.image));
    setIsModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : '');
  };

  const handleDelete = async (slug: string) => {
    if (!window.confirm(t('admin_confirm_delete'))) return;
    try {
      await apiClient.delete(`/products/${slug}/`);
      const isLastItemOnPage = products.length === 1 && currentPage > 1;
      const targetPage = isLastItemOnPage ? currentPage - 1 : currentPage;
      if (isLastItemOnPage) {
        setCurrentPage(targetPage);
      } else {
        fetchData(targetPage);
      }
    } catch (err) {
      alert(t('admin_err_delete'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // FormData истифода мебарем, то расмро низ бор кунем
      const fd = new FormData();
      fd.append('name_tj', formData.name_tj);
      fd.append('name_ru', formData.name_ru);
      fd.append('sku', formData.sku);
      fd.append('unit', formData.unit);
      fd.append('price', String(parseFloat(formData.price)));
      fd.append('cost_price', formData.cost_price ? String(parseFloat(formData.cost_price)) : '0');
      fd.append('stock', String(parseInt(formData.stock, 10)));
      fd.append('category', String(parseInt(formData.category as string, 10)));
      fd.append('description_tj', formData.description_tj || '');
      fd.append('description_ru', formData.description_ru || '');
      if (imageFile) fd.append('image', imageFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (editingSlug) {
        await apiClient.patch(`/products/${editingSlug}/`, fd, config);
      } else {
        await apiClient.post('/products/', fd, config);
      }

      setIsModalOpen(false);
      const targetPage = editingSlug ? currentPage : 1;
      if (!editingSlug && currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchData(targetPage);
      }
    } catch (err) {
      console.error("Save error", err);
      alert(t('admin_err_save'));
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('admin_prod_title')}</h1>
        <button className="btn-primary" onClick={openAddModal}>
          <Plus size={20} /> {t('admin_prod_add_btn')}
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>{t('admin_loading')}</div>
      ) : (
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
              {products.map(product => {
                const name = lang === 'tj' ? product.name_tj : (product.name_ru || product.name_tj);
                return (
                  <tr key={product.id}>
                    <td className={styles.tdImage}>
                      {product.image ? (
                        <img src={mediaUrl(product.image)} alt="" className={styles.thumb} />
                      ) : (
                        <div className={styles.thumbPlaceholder}><ImageIcon size={16} /></div>
                      )}
                    </td>
                    <td>{name}</td>
                    <td className={styles.mono}>{product.sku}</td>
                    <td className={styles.bold}>{product.price} TJS</td>
                    <td className={styles.textGray}>{product.cost_price || '-'} TJS</td>
                    <td>
                      <span className={product.stock > 10 ? styles.stockGood : product.stock > 0 ? styles.stockWarn : styles.stockOut}>
                        {product.stock} {product.unit}
                      </span>
                    </td>
                    <td className={styles.actions}>
                      <button className={styles.iconBtnEdit} onClick={() => openEditModal(product)}><Edit2 size={18} /></button>
                      <button className={styles.iconBtnDelete} onClick={() => handleDelete(product.slug)}><Trash2 size={18} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {Math.ceil(totalItems / PAGE_SIZE) > 1 && (
        <div className={styles.pagination}>
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className={styles.pageBtn}
          >
            {lang === 'tj' ? 'Қаблан' : 'Назад'}
          </button>
          
          {Array.from({ length: Math.ceil(totalItems / PAGE_SIZE) }, (_, i) => i + 1).map(pageNumber => (
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
            disabled={currentPage === Math.ceil(totalItems / PAGE_SIZE)}
            className={styles.pageBtn}
          >
            {lang === 'tj' ? 'Баъдӣ' : 'Вперед'}
          </button>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>{editingSlug ? t('admin_prod_modal_edit') : t('admin_prod_modal_new')}</h2>
              <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>{t('admin_form_category')}</label>
                  <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    <option value="" disabled>{lang === 'tj' ? 'Интихоб кунед' : 'Выберите'}</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {lang === 'tj' ? cat.name_tj : cat.name_ru}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className={styles.formGroup}>
                  <label>{t('admin_form_name_tj')}</label>
                  <input type="text" required value={formData.name_tj} onChange={e => setFormData({...formData, name_tj: e.target.value})} />
                </div>

                <div className={styles.formGroup}>
                  <label>{t('admin_form_name_ru')}</label>
                  <input type="text" required value={formData.name_ru} onChange={e => setFormData({...formData, name_ru: e.target.value})} />
                </div>
                
                <div className={styles.formGroup}>
                  <label>{t('admin_form_sku')}</label>
                  <input type="text" required value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
                </div>

                <div className={styles.formGroup}>
                  <label>{t('admin_form_unit')}</label>
                  <select required value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}>
                    <option value="дона">дона (шт)</option>
                    <option value="кг">кг</option>
                    <option value="литр">литр</option>
                    <option value="метр">метр</option>
                    <option value="м2">м2</option>
                    <option value="халта">халта (мешок)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>{t('admin_form_price')}</label>
                  <input type="number" step="0.01" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                </div>

                <div className={styles.formGroup}>
                  <label>{t('admin_form_cost')}</label>
                  <input type="number" step="0.01" value={formData.cost_price} onChange={e => setFormData({...formData, cost_price: e.target.value})} />
                </div>

                <div className={styles.formGroup}>
                  <label>{t('admin_form_stock')}</label>
                  <input type="number" required value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                </div>
              </div>
              
              <div className={styles.formGroupFull}>
                <label>{t('admin_form_desc')} (TJ)</label>
                <textarea rows={2} value={formData.description_tj} onChange={e => setFormData({...formData, description_tj: e.target.value})}></textarea>
              </div>

              <div className={styles.formGroupFull}>
                <label>{t('admin_form_desc')} (RU)</label>
                <textarea rows={2} value={formData.description_ru} onChange={e => setFormData({...formData, description_ru: e.target.value})}></textarea>
              </div>

              <div className={styles.formGroupFull}>
                <label>{t('admin_form_image')}</label>
                <div className={styles.imageUpload}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="" className={styles.imagePreview} />
                  ) : (
                    <div className={styles.imagePlaceholder}><ImageIcon size={28} /></div>
                  )}
                  <label className={styles.uploadBtn}>
                    <Upload size={18} /> {t('admin_form_image_hint')}
                    <input type="file" accept="image/*" onChange={handleImageChange} hidden />
                  </label>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>{t('admin_btn_cancel')}</button>
                <button type="submit" className="btn-primary">
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
