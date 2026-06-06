"use client";
import React, { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { Minus, Plus, Trash2, ArrowRight, CheckCircle, ShoppingBag } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import styles from './Cart.module.css';

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, clearCart, total } = useCart();
  const { lang, t } = useLanguage();
  const [step, setStep] = useState<'cart' | 'form' | 'done'>('cart');
  const [loading, setLoading] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  // Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+992');
  const [village, setVillage] = useState('');
  const [landmark, setLandmark] = useState('');
  const [notes, setNotes] = useState('');
  const [payment, setPayment] = useState('CASH');
  const [error, setError] = useState('');

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || phone.length < 12 || !village) {
      setError(t('checkout_error'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await apiClient.post('/orders/', {
        customer_name: name,
        customer_phone: phone,
        address_village: village,
        address_landmark: landmark,
        payment_method: payment,
        notes: notes,
        items: items.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
        })),
      });

      setOrderNumber(res.data.number);
      clearCart();
      setStep('done');
    } catch (err: any) {
      setError(err.response?.data?.items || err.response?.data?.detail || 
        (lang === 'tj' ? 'Хатогӣ рух дод. Дубора кӯшиш кунед.' : 'Произошла ошибка. Попробуйте еще раз.')
      );
    } finally {
      setLoading(false);
    }
  };

  // === DONE PAGE ===
  if (step === 'done') {
    return (
      <div className={`container ${styles.page}`}>
        <div className={styles.doneCard}>
          <CheckCircle size={64} className={styles.doneIcon} />
          <h1>{t('done_title')}</h1>
          <p className={styles.doneText}>
            {t('done_num')} <strong>{orderNumber}</strong>
          </p>
          <p className={styles.doneText}>
            {t('done_desc')}
          </p>
          <a href="/products" className="btn-primary" style={{marginTop: '1.5rem'}}>
            {t('done_btn_continue')} <ArrowRight size={20} />
          </a>
        </div>
      </div>
    );
  }

  // === CHECKOUT FORM ===
  if (step === 'form') {
    return (
      <div className={`container ${styles.page}`}>
        <div className={styles.formCard}>
          <h1 className={styles.formTitle}>{t('checkout_title')}</h1>
          <p className={styles.formDesc}>{t('checkout_desc')}</p>

          <form onSubmit={handleOrder} className={styles.form}>
            <div className={styles.field}>
              <label>{t('field_name')}</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t('field_name_placeholder')} required />
            </div>
            <div className={styles.field}>
              <label>{t('field_phone')}</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+992 988 00 11 22" required />
            </div>
            <div className={styles.field}>
              <label>{t('checkout_village')}</label>
              <input type="text" value={village} onChange={e => setVillage(e.target.value)} placeholder={t('checkout_village_placeholder')} required />
            </div>
            <div className={styles.field}>
              <label>{t('checkout_landmark')}</label>
              <textarea value={landmark} onChange={e => setLandmark(e.target.value)} placeholder={t('checkout_landmark_placeholder')} rows={2}></textarea>
            </div>
            <div className={styles.field}>
              <label>{t('checkout_payment')}</label>
              <select value={payment} onChange={e => setPayment(e.target.value)}>
                <option value="CASH">{t('pay_cash')}</option>
                <option value="CARD">{t('pay_card')}</option>
                <option value="TERMINAL">{t('pay_terminal')}</option>
              </select>
            </div>
            <div className={styles.field}>
              <label>{t('checkout_notes')}</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('checkout_notes_placeholder')} rows={2}></textarea>
            </div>

            {error && <div className={styles.error}>{typeof error === 'string' ? error : JSON.stringify(error)}</div>}

            <div className={styles.formActions}>
              <button type="button" className="btn-outline" onClick={() => setStep('cart')}>{t('cart_btn_back')}</button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? '...' : t('checkout_btn_submit')}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // === EMPTY CART ===
  if (items.length === 0) {
    return (
      <div className={`container ${styles.page}`}>
        <div className={styles.emptyCard}>
          <div className={styles.emptyIcon}>
            <ShoppingBag size={56} className={styles.emptyBagIcon} />
          </div>
          <h2>{t('cart_empty')}</h2>
          <p>{t('cart_empty_desc')}</p>
          <a href="/products" className="btn-primary" style={{marginTop: '1rem'}}>{t('home_btn_explore')}</a>
        </div>
      </div>
    );
  }

  // === CART LIST ===
  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>{t('cart_title')}</h1>
      <div className={styles.cartList}>
        {items.map(item => {
          const itemName = lang === 'tj' ? item.name_tj : item.name_ru;
          return (
            <div key={item.id} className={styles.cartItem}>
              <div className={styles.itemInfo}>
                <h3>{itemName}</h3>
                <p>{item.price} сом. / {item.unit || t('prod_unit_piece')}</p>
              </div>
              <div className={styles.itemActions}>
                <div className={styles.qty}>
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus size={18} /></button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus size={18} /></button>
                </div>
                <span className={styles.itemTotal}>{(Number(item.price) * item.quantity).toFixed(0)} TJS</span>
                <button className={styles.removeBtn} onClick={() => removeFromCart(item.id)}>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.summary}>
        <div className={styles.summaryRow}>
          <span>{t('cart_total')}</span>
          <span className={styles.summaryTotal}>{total.toFixed(0)} сомонӣ</span>
        </div>
        {total >= 5000 && <p className={styles.freeShip}>{t('cart_free_ship')}</p>}
        <button className="btn-primary" onClick={() => setStep('form')} style={{width: '100%', marginTop: '1rem'}}>
          {t('cart_btn_checkout')} <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}
