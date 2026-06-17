"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { Phone, Lock, Eye, EyeOff, ArrowRight, X, ShieldCheck } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useLanguage } from '@/context/LanguageContext';
import Brand from '@/components/Brand';
import styles from './AdminLogin.module.css';

export default function AdminLoginPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [phone, setPhone] = useState('+992');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (phone.replace(/\D/g, '').length < 11 || !password) {
      setError(lang === 'tj'
        ? 'Рақами телефон ва парол ҳатмист'
        : 'Введите номер телефона и пароль');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post('/token/', { phone, password });
      const { access } = res.data;

      if (access) {
        Cookies.set('access_token', access, { expires: 7 });
        router.push('/admin');
      }
    } catch {
      setError(lang === 'tj'
        ? 'Рақами телефон ё парол нодуруст аст, ё шумо ҳуқуқи администратор надоред.'
        : 'Неверный номер телефона или пароль, либо у вас нет прав администратора.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Link href="/" className={styles.closeBtn} aria-label={lang === 'tj' ? 'Бозгашт ба мағоза' : 'Вернуться в магазин'} title={lang === 'tj' ? 'Бозгашт ба мағоза' : 'Вернуться в магазин'}>
          <X size={20} />
        </Link>
        <div className={styles.logoContainer}>
          <Brand size={56} href="/" />
          <span className={styles.adminBadge}>
            <ShieldCheck size={14} /> {lang === 'tj' ? 'Панели идоракунӣ' : 'Панель управления'}
          </span>
        </div>

        <h1 className={styles.title}>
          {lang === 'tj' ? 'Воридшавии администратор' : 'Вход для администратора'}
        </h1>
        <p className={styles.subtitle}>
          {lang === 'tj'
            ? 'Барои вуруд ба панели идоракунӣ маълумоти худро ворид кунед'
            : 'Введите свои данные для входа в панель управления'}
        </p>

        <form onSubmit={handleLogin} className={styles.form} noValidate>
          <div className={styles.field}>
            <label htmlFor="admin-phone">
              {lang === 'tj' ? 'Рақами телефон' : 'Номер телефона'}
            </label>
            <div className={styles.inputWithIcon}>
              <Phone className={styles.inputIcon} size={18} />
              <input
                id="admin-phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+992 988 00 11 22"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="admin-password">
              {lang === 'tj' ? 'Парол' : 'Пароль'}
            </label>
            <div className={styles.inputWithIcon}>
              <Lock className={styles.inputIcon} size={18} />
              <input
                id="admin-password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
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
          </div>

          <div className={styles.liveRegion} role="alert" aria-live="assertive">
            {error && <div className={styles.error}>{error}</div>}
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? (
              <span className="spinner" aria-hidden />
            ) : (
              <>
                {lang === 'tj' ? 'Ворид шудан' : 'Войти'}
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <div className={styles.footerLink}>
          <Link href="/login">
            {lang === 'tj' ? 'Воридшавии муштарӣ' : 'Вход для покупателя'}
          </Link>
        </div>
      </div>
    </div>
  );
}
