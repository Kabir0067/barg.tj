"use client";
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { apiClient, mediaUrl, categoryImage } from '@/lib/apiClient';
import { formatPrice, formatUnit } from '@/lib/format';
import {
  Minus, Plus, Trash2, ArrowRight, ArrowLeft, CheckCircle2, ShoppingBag,
  User, Phone, MapPin, Package, Truck, ShieldCheck, BadgeCheck, Wallet,
  ImageOff, MessageCircle, ShoppingCart, ClipboardList, PartyPopper,
} from 'lucide-react';
import styles from './Cart.module.css';

// Backend delivery rule (api/models.py -> Order.calculate_total):
//   subtotal >= 10000  -> delivery is FREE (0)
//   otherwise         -> delivery fee = 20.00 сом.
// Totals are computed server-side; we mirror them here for display only.
const FREE_DELIVERY_THRESHOLD = 10000;
const DELIVERY_FEE = 20;

const WHATSAPP_NUMBER = '992928119002';
const PHONE_DISPLAY = '+992 928 11 90 02';
const PHONE_TEL = '+992928119002';

// Suggested categories for the empty state (slugs map to /public/categories/*.jpg)
const SUGGESTED = [
  { slug: 'cement', tj: 'Семент', ru: 'Цемент' },
  { slug: 'paints', tj: 'Рангҳо', ru: 'Краски' },
  { slug: 'tools', tj: 'Асбобҳо', ru: 'Инструменты' },
  { slug: 'electrical', tj: 'Барқӣ', ru: 'Электрика' },
];

type Step = 'cart' | 'form' | 'done';

// "+992 XX XXX XX XX" friendly mask, always anchored to +992
function maskPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('992')) digits = digits.slice(3);
  digits = digits.slice(0, 9);
  let out = '+992';
  if (digits.length > 0) out += ' ' + digits.slice(0, 2);
  if (digits.length > 2) out += ' ' + digits.slice(2, 5);
  if (digits.length > 5) out += ' ' + digits.slice(5, 7);
  if (digits.length > 7) out += ' ' + digits.slice(7, 9);
  return out;
}

// Canonical "+992XXXXXXXXX" for the API + validity check
function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('992')) digits = digits.slice(3);
  digits = digits.slice(0, 9);
  return '+992' + digits;
}

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, clearCart } = useCart();
  const { lang, t } = useLanguage();

  const [step, setStep] = useState<Step>('cart');
  const [loading, setLoading] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+992');
  const [village, setVillage] = useState('');

  const [errors, setErrors] = useState<{ name?: string; phone?: string; village?: string }>({});
  const [formError, setFormError] = useState('');

  // ---- Totals (mirror of backend) ----
  const subtotal = useMemo(
    () => items.reduce((acc, it) => acc + Number(it.price) * it.quantity, 0),
    [items]
  );
  const isFreeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD;
  const deliveryFee = subtotal === 0 ? 0 : isFreeDelivery ? 0 : DELIVERY_FEE;
  const grandTotal = subtotal + deliveryFee;
  const remainingForFree = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  const freeProgress = Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100);

  const tr = (tj: string, ru: string) => (lang === 'tj' ? tj : ru);

  const validate = () => {
    const next: { name?: string; phone?: string; village?: string } = {};
    if (!name.trim()) next.name = tr('Лутфан номатонро нависед', 'Пожалуйста, укажите имя');
    const canonical = normalizePhone(phone);
    if (canonical.length !== 13) {
      next.phone = tr('Рақами телефони пурра нависед (+992 ва 9 рақам)', 'Введите полный номер (+992 и 9 цифр)');
    }
    if (!village.trim()) next.village = tr('Суроғаро нависед', 'Укажите адрес');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // guard double-submit
    setFormError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await apiClient.post('/orders/', {
        customer_name: name.trim(),
        customer_phone: normalizePhone(phone),
        address_village: village.trim(),
        payment_method: 'CASH',
        items: items.map((it) => ({ product_id: it.id, quantity: it.quantity })),
      });
      setOrderNumber(res.data.number);
      clearCart();
      setStep('done');
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      const d = err?.response?.data;
      const msg =
        d?.items || d?.detail || d?.customer_phone ||
        tr('Хатогӣ рух дод. Дубора кӯшиш кунед.', 'Произошла ошибка. Попробуйте ещё раз.');
      setFormError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  // ===================== STEPPER =====================
  const Stepper = ({ current }: { current: Step }) => {
    const order: Step[] = ['cart', 'form', 'done'];
    const idx = order.indexOf(current);
    const labels = {
      cart: tr('Сабад', 'Корзина'),
      form: tr('Тафсилот', 'Детали'),
      done: tr('Тайёр', 'Готово'),
    };
    const icons = { cart: ShoppingCart, form: ClipboardList, done: CheckCircle2 };
    return (
      <ol className={styles.stepper} aria-label={tr('Марҳилаҳои фармоиш', 'Шаги заказа')}>
        {order.map((s, i) => {
          const Icon = icons[s];
          const state = i < idx ? 'done' : i === idx ? 'active' : 'todo';
          return (
            <li key={s} className={styles.stepItem} data-state={state}>
              <span className={styles.stepDot}>
                {state === 'done' ? <CheckCircle2 size={16} /> : <Icon size={16} />}
              </span>
              <span className={styles.stepLabel}>{labels[s]}</span>
              {i < order.length - 1 && <span className={styles.stepBar} aria-hidden />}
            </li>
          );
        })}
      </ol>
    );
  };

  // ===================== DONE =====================
  if (step === 'done') {
    const waText = encodeURIComponent(
      tr(
        `Салом! Ман фармоиши ${orderNumber}-ро додам.`,
        `Здравствуйте! Я оформил(а) заказ ${orderNumber}.`
      )
    );
    return (
      <div className={`container ${styles.page}`}>
        <Stepper current="done" />
        <div className={styles.doneCard}>
          <div className={styles.doneBurst} aria-hidden>
            <span /><span /><span /><span /><span /><span />
          </div>
          <div className={styles.doneIconWrap}><CheckCircle2 size={52} strokeWidth={2.4} /></div>
          <h1>{t('done_title')}</h1>
          <p className={styles.doneNum}>
            {t('done_num')} <strong className="tnum">{orderNumber}</strong>
          </p>
          <p className={styles.doneText}>{t('done_desc')}</p>

          {/* What happens next */}
          <ul className={styles.timeline}>
            <li>
              <span className={styles.tlIcon}><PartyPopper size={16} /></span>
              <div>
                <strong>{tr('Фармоиш қабул шуд', 'Заказ принят')}</strong>
                <small>{tr('Дархости шумо ба система ворид шуд', 'Ваша заявка зарегистрирована')}</small>
              </div>
            </li>
            <li>
              <span className={styles.tlIcon}><Phone size={16} /></span>
              <div>
                <strong>{tr('Тамос мегирем', 'Перезвоним')}</strong>
                <small>{tr('Барои тасдиқ ва тафсилоти расонидан', 'Для подтверждения и деталей доставки')}</small>
              </div>
            </li>
            <li>
              <span className={styles.tlIcon}><Truck size={16} /></span>
              <div>
                <strong>{tr('Расонидан', 'Доставка')}</strong>
                <small>{tr('Дар 1–2 рӯз ба суроғаи шумо', 'В течение 1–2 дней по адресу')}</small>
              </div>
            </li>
          </ul>

          <div className={styles.doneActions}>
            <a href={`tel:${PHONE_TEL}`} className={`btn-outline ${styles.doneAction}`}>
              <Phone size={18} /> {tr('Занг задан', 'Позвонить')}
            </a>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.doneAction} ${styles.waBtn}`}
            >
              <MessageCircle size={18} /> WhatsApp
            </a>
          </div>
          <Link href="/products" className={`btn-primary ${styles.doneContinue}`}>
            {t('done_btn_continue')} <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    );
  }

  // ===================== EMPTY CART =====================
  if (items.length === 0) {
    return (
      <div className={`container ${styles.page}`}>
        <h1 className={styles.title}>{t('cart_title')}</h1>
        <div className={styles.emptyCard}>
          <div className={styles.emptyIcon}>
            <ShoppingBag size={48} className={styles.emptyBagIcon} />
          </div>
          <h2>{t('cart_empty')}</h2>
          <p>{t('cart_empty_desc')}</p>
          <Link href="/products" className={`btn-primary ${styles.emptyCta}`}>
            {t('home_btn_explore')} <ArrowRight size={18} />
          </Link>

          <div className={styles.suggestWrap}>
            <span className={styles.suggestEyebrow}>
              {tr('Категорияҳои маъмул', 'Популярные категории')}
            </span>
            <div className={styles.suggestGrid}>
              {SUGGESTED.map((c) => (
                <Link
                  key={c.slug}
                  href={`/products?category=${c.slug}`}
                  className={styles.suggestCard}
                >
                  <img
                    src={categoryImage(c.slug)}
                    alt={tr(c.tj, c.ru)}
                    className={styles.suggestImg}
                    loading="lazy"
                  />
                  <span className={styles.suggestOverlay} aria-hidden />
                  <span className={styles.suggestName}>{tr(c.tj, c.ru)}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===================== SHARED: ORDER SUMMARY =====================
  const SummaryCard = ({ compact = false }: { compact?: boolean }) => (
    <div className={styles.summaryCard}>
      <h2 className={styles.summaryHead}>{tr('Хулосаи фармоиш', 'Сумма заказа')}</h2>

      {!compact && !isFreeDelivery && (
        <div className={styles.freeBar}>
          <div className={styles.freeBarText}>
            <Truck size={15} />
            <span>
              {tr(
                `То расонидани ройгон: ${formatPrice(remainingForFree)}`,
                `До бесплатной доставки: ${formatPrice(remainingForFree)}`
              )}
            </span>
          </div>
          <div className={styles.freeBarTrack}>
            <div className={styles.freeBarFill} style={{ width: `${freeProgress}%` }} />
          </div>
        </div>
      )}

      <div className={styles.sumRows}>
        <div className={styles.sumRow}>
          <span>{tr('Маҳсулот', 'Товары')}</span>
          <span className="tnum">{formatPrice(subtotal)}</span>
        </div>
        <div className={styles.sumRow}>
          <span>{tr('Расонидан', 'Доставка')}</span>
          {isFreeDelivery ? (
            <span className={styles.freeTag}>{tr('Ройгон', 'Бесплатно')}</span>
          ) : (
            <span className="tnum">{formatPrice(deliveryFee)}</span>
          )}
        </div>
      </div>

      <div className={styles.sumDivider} />

      <div className={styles.sumTotalRow}>
        <span>{tr('Ҳамагӣ', 'Итого')}</span>
        <span className={`${styles.sumTotalValue} tnum`}>{formatPrice(grandTotal)}</span>
      </div>

      {step === 'cart' ? (
        <button
          className={`btn-primary ${styles.summaryBtn}`}
          onClick={() => setStep('form')}
        >
          {t('cart_btn_checkout')} <ArrowRight size={20} />
        </button>
      ) : (
        <button
          type="submit"
          form="checkoutForm"
          className={`btn-primary ${styles.summaryBtn}`}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner" aria-hidden /> {tr('Дар ҳоли иҷро…', 'Оформляем…')}
            </>
          ) : (
            <>{t('checkout_btn_submit')} <ArrowRight size={18} /></>
          )}
        </button>
      )}

      {/* Trust badges */}
      <ul className={styles.trust}>
        <li><Wallet size={16} /> {tr('Пардохт ҳангоми гирифтан', 'Оплата при получении')}</li>
        <li><Truck size={16} /> {tr('Расонидан дар 1–2 рӯз', 'Доставка за 1–2 дня')}</li>
        <li><ShieldCheck size={16} /> {tr('Бекоркунии ройгон', 'Бесплатная отмена')}</li>
      </ul>
    </div>
  );

  // ===================== CART LIST =====================
  if (step === 'cart') {
    return (
      <div className={`container ${styles.page} ${styles.hasBar}`}>
        <Stepper current="cart" />
        <h1 className={styles.title}>{t('cart_title')}</h1>

        <div className={styles.layout}>
          {/* LEFT: items */}
          <div className={styles.main}>
            <div className={styles.cartList}>
              {items.map((item) => {
                const itemName = lang === 'tj' ? item.name_tj : item.name_ru;
                const lineTotal = Number(item.price) * item.quantity;
                const img = mediaUrl(item.image);
                return (
                  <div key={item.id} className={styles.cartItem}>
                    <div className={styles.thumb}>
                      {img ? (
                        <img
                          src={img}
                          alt={itemName}
                          className={styles.thumbImg}
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                            const ph = e.currentTarget.nextElementSibling as HTMLElement | null;
                            if (ph) ph.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <span
                        className={styles.thumbFallback}
                        style={{ display: img ? 'none' : 'flex' }}
                        aria-hidden
                      >
                        <ImageOff size={20} />
                      </span>
                    </div>

                    <div className={styles.itemInfo}>
                      <h3 title={itemName}>{itemName}</h3>
                      <p className={styles.itemUnit}>
                        <span className="tnum">{formatPrice(item.price)}</span>
                        <span className={styles.perUnit}> / {formatUnit(item.unit, lang)}</span>
                      </p>
                      <span className={`${styles.lineTotalMobile} tnum`}>
                        {formatPrice(lineTotal)}
                      </span>
                    </div>

                    <div className={styles.itemActions}>
                      <div className={styles.qty}>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          aria-label={tr('Камтар кардан', 'Уменьшить')}
                        >
                          <Minus size={16} />
                        </button>
                        <span className="tnum" aria-live="polite">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          aria-label={tr('Зиёд кардан', 'Увеличить')}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      <span className={`${styles.lineTotal} tnum`}>{formatPrice(lineTotal)}</span>
                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => removeFromCart(item.id)}
                        aria-label={tr('Нест кардан', 'Удалить')}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <Link href="/products" className={styles.continueLink}>
              <ArrowLeft size={16} /> {tr('Идомаи харид', 'Продолжить покупки')}
            </Link>
          </div>

          {/* RIGHT: sticky summary (desktop) */}
          <aside className={styles.aside}>
            <SummaryCard />
          </aside>
        </div>

        {/* Fixed bottom checkout bar (mobile) */}
        <div className={styles.mobileBar}>
          <div className={styles.mobileBarInfo}>
            <span className={styles.mobileBarLabel}>{tr('Ҳамагӣ', 'Итого')}</span>
            <span className={`${styles.mobileBarTotal} tnum`}>{formatPrice(grandTotal)}</span>
          </div>
          <button className={`btn-primary ${styles.mobileBarBtn}`} onClick={() => setStep('form')}>
            {t('cart_btn_checkout')} <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // ===================== CHECKOUT FORM =====================
  return (
    <div className={`container ${styles.page} ${styles.hasBar}`}>
      <Stepper current="form" />
      <h1 className={styles.title}>{t('checkout_title')}</h1>

      <div className={styles.layout}>
        {/* LEFT: form */}
        <div className={styles.main}>
          <div className={styles.formCard}>
            <p className={styles.formDesc}>{t('checkout_desc')}</p>

            <form id="checkoutForm" onSubmit={handleOrder} className={styles.form} noValidate>
              <div className={styles.field}>
                <label htmlFor="cust_name"><User size={14} /> {t('field_name')}</label>
                <input
                  id="cust_name"
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((p) => ({ ...p, name: undefined })); }}
                  placeholder={t('field_name_placeholder')}
                  autoComplete="name"
                  aria-invalid={errors.name ? 'true' : undefined}
                  aria-describedby={errors.name ? 'err_name' : undefined}
                />
                {errors.name && <span id="err_name" role="alert" className={styles.fieldErr}>{errors.name}</span>}
              </div>

              <div className={styles.field}>
                <label htmlFor="cust_phone"><Phone size={14} /> {t('field_phone')}</label>
                <input
                  id="cust_phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => { setPhone(maskPhone(e.target.value)); if (errors.phone) setErrors((p) => ({ ...p, phone: undefined })); }}
                  placeholder="+992 92 811 90 02"
                  autoComplete="tel"
                  aria-invalid={errors.phone ? 'true' : undefined}
                  aria-describedby={errors.phone ? 'err_phone' : undefined}
                />
                {errors.phone && <span id="err_phone" role="alert" className={styles.fieldErr}>{errors.phone}</span>}
              </div>

              <div className={styles.field}>
                <label htmlFor="cust_addr"><MapPin size={14} /> {tr('Суроғаи дақиқ', 'Точный адрес')}</label>
                <input
                  id="cust_addr"
                  type="text"
                  value={village}
                  onChange={(e) => { setVillage(e.target.value); if (errors.village) setErrors((p) => ({ ...p, village: undefined })); }}
                  placeholder={tr('Ноҳия, деҳа, кӯча, хона', 'Район, кишлак, улица, дом')}
                  autoComplete="street-address"
                  aria-invalid={errors.village ? 'true' : undefined}
                  aria-describedby={errors.village ? 'err_addr' : undefined}
                />
                {errors.village && <span id="err_addr" role="alert" className={styles.fieldErr}>{errors.village}</span>}
              </div>

              <div className={styles.payNote}>
                <Wallet size={18} />
                <div>
                  <strong>{tr('Пардохти нақдӣ', 'Оплата наличными')}</strong>
                  <small>{tr('Ҳангоми гирифтани мол ба курьер пардохт мекунед', 'Вы платите курьеру при получении')}</small>
                </div>
                <BadgeCheck size={20} className={styles.payCheck} />
              </div>

              {formError && (
                <div className={styles.error} role="alert">{formError}</div>
              )}
            </form>
          </div>

          <button type="button" className={styles.continueLink} onClick={() => setStep('cart')}>
            <ArrowLeft size={16} /> {t('cart_btn_back')}
          </button>
        </div>

        {/* RIGHT: sticky summary */}
        <aside className={styles.aside}>
          <SummaryCard />
        </aside>
      </div>

      {/* Fixed bottom submit bar (mobile) */}
      <div className={styles.mobileBar}>
        <div className={styles.mobileBarInfo}>
          <span className={styles.mobileBarLabel}>{tr('Ҳамагӣ', 'Итого')}</span>
          <span className={`${styles.mobileBarTotal} tnum`}>{formatPrice(grandTotal)}</span>
        </div>
        <button
          type="submit"
          form="checkoutForm"
          className={`btn-primary ${styles.mobileBarBtn}`}
          disabled={loading}
        >
          {loading ? (
            <><span className="spinner" aria-hidden /> {tr('Иҷро…', 'Оформ…')}</>
          ) : (
            <>{t('checkout_btn_submit')} <ArrowRight size={18} /></>
          )}
        </button>
      </div>
    </div>
  );
}
