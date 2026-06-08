"use client";
import React, { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { Minus, Plus, Trash2, ArrowRight, CheckCircle, ShoppingBag, User, Phone, MapPin, Package } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import styles from './Cart.module.css';

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, clearCart, total } = useCart();
  const { lang, t } = useLanguage();
  const [step, setStep] = useState<'cart' | 'form' | 'done'>('cart');
  const [loading, setLoading] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+992');
  const [village, setVillage] = useState('');
  const [error, setError] = useState('');

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || phone.length < 12 || !village.trim()) {
      setError(t('checkout_error'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/orders/', {
        customer_name: name.trim(),
        customer_phone: phone,
        address_village: village.trim(),
        payment_method: 'CASH',
        items: items.map(item => ({ product_id: item.id, quantity: item.quantity })),
      });
      setOrderNumber(res.data.number);
      clearCart();
      setStep('done');
    } catch (err: any) {
      const d = err.response?.data;
      setError(d?.items || d?.detail || d?.customer_phone ||
        (lang === 'tj' ? 'Хатогӣ рух дод. Дубора кӯшиш кунед.' : 'Произошла ошибка. Попробуйте ещё раз.'));
    } finally {
      setLoading(false);
    }
  };

  // === DONE ===
  if (step === 'done') {
    return (
      <div className={`container ${styles.page}`}>
        <div className={styles.doneCard}>
          <div className={styles.doneIconWrap}><CheckCircle size={56} /></div>
          <h1>{t('done_title')}</h1>
          <p className={styles.doneNum}>{t('done_num')} <strong>{orderNumber}</strong></p>
          <p className={styles.doneText}>{t('done_desc')}</p>
          <a href="/products" className="btn-primary" style={{marginTop:'1rem'}}>
            {t('done_btn_continue')} <ArrowRight size={20}/>
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
          <div className={styles.formHead}>
            <h1 className={styles.formTitle}>{t('checkout_title')}</h1>
            <p className={styles.formDesc}>{lang === 'tj' ? 'Маълумоти тамосро пур кунед' : 'Заполните контактные данные'}</p>
          </div>

          {/* Order summary mini */}
          <div className={styles.miniSummary}>
            <Package size={16}/>
            <span>{items.length} {lang === 'tj' ? 'навъи маҳсулот' : 'вида товара'}</span>
            <span className={styles.miniTotal}>{total.toFixed(0)} сом.</span>
          </div>

          <form onSubmit={handleOrder} className={styles.form}>
            <div className={styles.field}>
              <label><User size={14}/> {t('field_name')}</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={lang === 'tj' ? 'Ном ва насаби шумо' : 'Ваше имя и фамилия'}
                required
                autoComplete="name"
              />
            </div>

            <div className={styles.field}>
              <label><Phone size={14}/> {t('field_phone')}</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+992 988 00 11 22"
                required
                autoComplete="tel"
              />
            </div>

            <div className={styles.field}>
              <label><MapPin size={14}/> {lang === 'tj' ? 'Суроғаи дақиқ' : 'Точный адрес'}</label>
              <input
                type="text"
                value={village}
                onChange={e => setVillage(e.target.value)}
                placeholder={lang === 'tj' ? 'Ноҳия, деҳа, кӯча, хона' : 'Район, кишлак, улица, дом'}
                required
                autoComplete="street-address"
              />
            </div>

            {error && (
              <div className={styles.error}>
                {typeof error === 'string' ? error : JSON.stringify(error)}
              </div>
            )}

            <div className={styles.formActions}>
              <button type="button" className="btn-outline" onClick={() => setStep('cart')}>
                {t('cart_btn_back')}
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading
                  ? (lang === 'tj' ? 'Дар ҳоли иҷро...' : 'Оформляем...')
                  : t('checkout_btn_submit')}
                {!loading && <ArrowRight size={18}/>}
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
          <div className={styles.emptyIcon}><ShoppingBag size={56} className={styles.emptyBagIcon}/></div>
          <h2>{t('cart_empty')}</h2>
          <p>{t('cart_empty_desc')}</p>
          <a href="/products" className="btn-primary" style={{marginTop:'1rem'}}>{t('home_btn_explore')}</a>
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
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus size={16}/></button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus size={16}/></button>
                </div>
                <span className={styles.itemTotal}>{(Number(item.price) * item.quantity).toFixed(0)} сом.</span>
                <button className={styles.removeBtn} onClick={() => removeFromCart(item.id)}><Trash2 size={18}/></button>
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
        {total >= 5000
          ? <p className={styles.freeShip}>🎉 {t('cart_free_ship')}</p>
          : <p className={styles.deliveryNote}>
              {lang === 'tj' ? `Расонидан: 20 сом. (барои 5000+ ройгон)` : `Доставка: 20 сом. (от 5000 бесплатно)`}
            </p>
        }
        <button className={`btn-primary ${styles.checkoutBtn}`} onClick={() => setStep('form')}>
          {t('cart_btn_checkout')} <ArrowRight size={20}/>
        </button>
      </div>
    </div>
  );
}
