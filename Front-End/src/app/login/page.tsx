"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { Phone, ArrowRight, UserPlus, LogIn, Leaf, Lock, User, Eye, EyeOff } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useLanguage } from '@/context/LanguageContext';
import styles from './Login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('+992');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetMessages = () => { setError(''); setSuccess(''); };

  const switchTab = (tab: 'login' | 'register') => {
    setActiveTab(tab);
    resetMessages();
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (phone.replace(/\D/g, '').length < 11) {
      setError(t('err_phone_length'));
      return;
    }
    if (password.length < 6) {
      setError(t('err_password_short'));
      return;
    }
    if (activeTab === 'register' && password !== confirm) {
      setError(t('err_password_mismatch'));
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
          window.location.href = '/products';
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

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoContainer}>
          <div className={styles.iconWrap}>
            <Leaf size={32} className={styles.leafIcon} color="#fff" fill="#fff" />
          </div>
          <span className={styles.logoText}>Barg.tj</span>
        </div>

        {/* Tab Switcher */}
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === 'login' ? styles.activeTab : ''}`}
            onClick={() => switchTab('login')}
          >
            <LogIn size={18} /> {t('login_tab')}
          </button>
          <button
            type="button"
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

        <form onSubmit={handleAction} className={styles.form}>
          {activeTab === 'register' && (
            <div className={styles.field}>
              <label>{t('field_name')}</label>
              <div className={styles.inputWithIcon}>
                <User className={styles.inputIcon} size={18} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('field_name_placeholder')}
                  required
                />
              </div>
            </div>
          )}

          <div className={styles.field}>
            <label>{t('field_phone')}</label>
            <div className={styles.inputWithIcon}>
              <Phone className={styles.inputIcon} size={18} />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+992 988 00 11 22"
                required
              />
            </div>
          </div>

          <div className={styles.field}>
            <label>{t('field_password')}</label>
            <div className={styles.inputWithIcon}>
              <Lock className={styles.inputIcon} size={18} />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('field_password_placeholder')}
                autoComplete={activeTab === 'register' ? 'new-password' : 'current-password'}
                required
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPass((s) => !s)}
                aria-label="toggle password"
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {activeTab === 'register' && (
            <div className={styles.field}>
              <label>{t('field_password_confirm')}</label>
              <div className={styles.inputWithIcon}>
                <Lock className={styles.inputIcon} size={18} />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder={t('field_password_confirm_placeholder')}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? '...' : (activeTab === 'login' ? t('btn_login') : t('btn_register'))}
            {!loading && <ArrowRight size={20} />}
          </button>
        </form>

        <div className={styles.footerLink}>
          {activeTab === 'login' ? (
            <p>{t('no_account')} <span onClick={() => switchTab('register')} className={styles.switchLink}>{t('switch_to_register')}</span></p>
          ) : (
            <p>{t('have_account')} <span onClick={() => switchTab('login')} className={styles.switchLink}>{t('switch_to_login')}</span></p>
          )}
        </div>
      </div>
    </div>
  );
}
