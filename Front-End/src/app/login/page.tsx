"use client";
import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { Phone, ArrowRight, UserPlus, LogIn, Lock, User, Eye, EyeOff, X, ShieldCheck } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useLanguage } from '@/context/LanguageContext';
import Brand from '@/components/Brand';
import styles from './Login.module.css';

type FieldErrors = {
  name?: string;
  phone?: string;
  password?: string;
  confirm?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('+992');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const resetMessages = () => { setError(''); setSuccess(''); };

  const switchTab = (tab: 'login' | 'register') => {
    setActiveTab(tab);
    resetMessages();
    setFieldErrors({});
    setTouched({});
  };

  // Password strength: 0..4
  const strength = useMemo(() => {
    let s = 0;
    if (password.length >= 6) s++;
    if (password.length >= 10) s++;
    if (/[A-Za-z]/.test(password) && /\d/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return Math.min(s, 4);
  }, [password]);

  const strengthLabel = useMemo(() => {
    if (!password) return '';
    if (strength <= 1) return lang === 'tj' ? 'Заиф' : 'Слабый';
    if (strength === 2) return lang === 'tj' ? 'Миёна' : 'Средний';
    if (strength === 3) return lang === 'tj' ? 'Хуб' : 'Хороший';
    return lang === 'tj' ? 'Қавӣ' : 'Надёжный';
  }, [strength, password, lang]);

  const validate = (): FieldErrors => {
    const errs: FieldErrors = {};
    if (activeTab === 'register' && !name.trim()) {
      errs.name = lang === 'tj' ? 'Лутфан номатонро нависед' : 'Пожалуйста, укажите имя';
    }
    if (phone.replace(/\D/g, '').length < 11) {
      errs.phone = t('err_phone_length');
    }
    if (password.length < 6) {
      errs.password = t('err_password_short');
    }
    if (activeTab === 'register' && password !== confirm) {
      errs.confirm = t('err_password_mismatch');
    }
    return errs;
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setTouched({ name: true, phone: true, password: true, confirm: true });

    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setError(errs.name || errs.phone || errs.password || errs.confirm || t('err_login'));
      return;
    }

    setLoading(true);
    try {
      const endpoint = activeTab === 'register' ? '/auth/register/' : '/auth/login/';
      const payload =
        activeTab === 'register'
          ? { phone, name, password }
          : { phone, password };

      const res = await apiClient.post(endpoint, payload);
      const { access } = res.data;
      if (access) {
        Cookies.set('access_token', access, { expires: 30 });
        setSuccess(activeTab === 'register' ? t('msg_success_register') : t('msg_success_login'));
        setTimeout(() => {
          router.push('/products');
        }, 900);
      }
    } catch (err: any) {
      const data = err.response?.data;
      setError(
        data?.detail ||
        (Array.isArray(data?.phone) ? data.phone[0] : data?.phone) ||
        (Array.isArray(data?.password) ? data.password[0] : data?.password) ||
        t('err_login')
      );
    } finally {
      setLoading(false);
    }
  };

  const fieldInvalid = (key: keyof FieldErrors) => touched[key] && !!fieldErrors[key];

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Link href="/" className={styles.closeBtn} aria-label={lang === 'tj' ? 'Бозгашт ба мағоза' : 'Вернуться в магазин'} title={lang === 'tj' ? 'Бозгашт ба мағоза' : 'Вернуться в магазин'}>
          <X size={20} />
        </Link>
        <div className={styles.logoContainer}>
          <Brand size={64} href="/" />
        </div>

        {/* Tab Switcher */}
        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'login'}
            className={`${styles.tab} ${activeTab === 'login' ? styles.activeTab : ''}`}
            onClick={() => switchTab('login')}
          >
            <LogIn size={18} /> {t('login_tab')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'register'}
            className={`${styles.tab} ${activeTab === 'register' ? styles.activeTab : ''}`}
            onClick={() => switchTab('register')}
          >
            <UserPlus size={18} /> {t('register_tab')}
          </button>
        </div>

        <h1 className={styles.title}>
          {activeTab === 'login' ? t('login_welcome') : t('register_welcome')}
        </h1>
        <p className={styles.desc}>
          {activeTab === 'login' ? t('login_desc') : t('register_desc')}
        </p>

        <form onSubmit={handleAction} className={styles.form} noValidate>
          {activeTab === 'register' && (
            <div className={styles.field}>
              <label htmlFor="login-name">{t('field_name')}</label>
              <div className={styles.inputWithIcon}>
                <User className={styles.inputIcon} size={18} />
                <input
                  id="login-name"
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); if (touched.name) setFieldErrors(validate()); }}
                  onBlur={() => { setTouched((p) => ({ ...p, name: true })); setFieldErrors(validate()); }}
                  placeholder={t('field_name_placeholder')}
                  aria-invalid={fieldInvalid('name')}
                  aria-describedby={fieldInvalid('name') ? 'login-name-err' : undefined}
                  required
                />
              </div>
              {fieldInvalid('name') && (
                <span id="login-name-err" className={styles.fieldError} role="alert">{fieldErrors.name}</span>
              )}
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="login-phone">{t('field_phone')}</label>
            <div className={styles.inputWithIcon}>
              <Phone className={styles.inputIcon} size={18} />
              <input
                id="login-phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); if (touched.phone) setFieldErrors(validate()); }}
                onBlur={() => { setTouched((p) => ({ ...p, phone: true })); setFieldErrors(validate()); }}
                placeholder="+992 988 00 11 22"
                aria-invalid={fieldInvalid('phone')}
                aria-describedby={fieldInvalid('phone') ? 'login-phone-err' : undefined}
                required
              />
            </div>
            {fieldInvalid('phone') && (
              <span id="login-phone-err" className={styles.fieldError} role="alert">{fieldErrors.phone}</span>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="login-password">{t('field_password')}</label>
            <div className={styles.inputWithIcon}>
              <Lock className={styles.inputIcon} size={18} />
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (touched.password) setFieldErrors(validate()); }}
                onBlur={() => { setTouched((p) => ({ ...p, password: true })); setFieldErrors(validate()); }}
                placeholder={t('field_password_placeholder')}
                autoComplete={activeTab === 'register' ? 'new-password' : 'current-password'}
                aria-invalid={fieldInvalid('password')}
                aria-describedby={fieldInvalid('password') ? 'login-password-err' : undefined}
                required
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPass((s) => !s)}
                aria-label={
                  showPass
                    ? (lang === 'tj' ? 'Пинҳон кардани парол' : 'Скрыть пароль')
                    : (lang === 'tj' ? 'Намоиши парол' : 'Показать пароль')
                }
                aria-pressed={showPass}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldInvalid('password') && (
              <span id="login-password-err" className={styles.fieldError} role="alert">{fieldErrors.password}</span>
            )}

            {activeTab === 'register' && password.length > 0 && (
              <div className={styles.strength} aria-live="polite">
                <div className={styles.strengthBars}>
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className={`${styles.strengthBar} ${i < strength ? styles[`s${strength}`] : ''}`}
                    />
                  ))}
                </div>
                <span className={styles.strengthLabel}>{strengthLabel}</span>
              </div>
            )}
          </div>

          {activeTab === 'register' && (
            <div className={styles.field}>
              <label htmlFor="login-confirm">{t('field_password_confirm')}</label>
              <div className={styles.inputWithIcon}>
                <Lock className={styles.inputIcon} size={18} />
                <input
                  id="login-confirm"
                  type={showPass ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); if (touched.confirm) setFieldErrors(validate()); }}
                  onBlur={() => { setTouched((p) => ({ ...p, confirm: true })); setFieldErrors(validate()); }}
                  placeholder={t('field_password_confirm_placeholder')}
                  autoComplete="new-password"
                  aria-invalid={fieldInvalid('confirm')}
                  aria-describedby={fieldInvalid('confirm') ? 'login-confirm-err' : undefined}
                  required
                />
              </div>
              {fieldInvalid('confirm') && (
                <span id="login-confirm-err" className={styles.fieldError} role="alert">{fieldErrors.confirm}</span>
              )}
            </div>
          )}

          <div className={styles.liveRegion} role="alert" aria-live="assertive">
            {error && <div className={styles.error}>{error}</div>}
            {success && <div className={styles.success}><ShieldCheck size={16} /> {success}</div>}
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? (
              <span className="spinner" aria-hidden />
            ) : (
              <>
                {activeTab === 'login' ? t('btn_login') : t('btn_register')}
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <div className={styles.footerLink}>
          {activeTab === 'login' ? (
            <p>{t('no_account')} <span onClick={() => switchTab('register')} className={styles.switchLink}>{t('switch_to_register')}</span></p>
          ) : (
            <p>{t('have_account')} <span onClick={() => switchTab('login')} className={styles.switchLink}>{t('switch_to_login')}</span></p>
          )}
        </div>

        {activeTab === 'login' && (
          <div className={styles.adminFooterLink}>
            <Link href="/admin-login">
              {lang === 'tj' ? 'Воридшавии администратор' : 'Вход для администратора'}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
