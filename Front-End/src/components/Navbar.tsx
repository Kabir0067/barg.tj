"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { ShoppingCart, Menu, X, Leaf, Shield, LogOut, Sun, Moon, User } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { itemCount } = useCart();
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = Cookies.get('access_token');
    if (token) {
      apiClient.get('/auth/me/')
        .then(res => setUser(res.data))
        .catch(() => {
          Cookies.remove('access_token');
          setUser(null);
        });
    }
  }, []);

  const handleLogout = () => {
    Cookies.remove('access_token');
    setUser(null);
    window.location.href = '/';
  };

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.logo}>
          <Leaf size={24} className={styles.logoIcon} fill="var(--brand-primary)" />
          <span>Barg.tj</span>
        </Link>

        <nav className={styles.desktop}>
          <Link href="/products" className={styles.link}>{t('nav_products')}</Link>
          
          {user?.is_staff && (
            <Link href="/admin" className={styles.adminLink}>
              <Shield size={16} /> {t('nav_admin')}
            </Link>
          )}

          <Link href="/cart" className={styles.cartLink}>
            <ShoppingCart size={22} />
            {itemCount > 0 && <span className={styles.badge}>{itemCount}</span>}
          </Link>

          {/* Theme Toggler */}
          <button onClick={toggleTheme} className={styles.themeToggle} aria-label="Toggle Theme">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {/* Language Switcher */}
          <div className={styles.langSwitch}>
            <button 
              onClick={() => setLang('tj')} 
              className={`${styles.langBtn} ${lang === 'tj' ? styles.langActive : ''}`}
            >
              TJ
            </button>
            <button 
              onClick={() => setLang('ru')} 
              className={`${styles.langBtn} ${lang === 'ru' ? styles.langActive : ''}`}
            >
              RU
            </button>
          </div>

          {user ? (
            <div className={styles.userSection}>
              <span className={styles.username}>{user.name || user.phone}</span>
              <button onClick={handleLogout} className={styles.logoutBtn} title={t('nav_logout')}>
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link href="/login" className={styles.loginLink}><User size={16} /> {t('nav_login')}</Link>
          )}
        </nav>

        <div className={styles.mobileActions}>
          <button onClick={toggleTheme} className={styles.themeToggle} aria-label="Toggle Theme">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <Link href="/cart" className={styles.cartLink}>
            <ShoppingCart size={22} />
            {itemCount > 0 && <span className={styles.badge}>{itemCount}</span>}
          </Link>
          <button onClick={() => setOpen(!open)} className={styles.burger}>
            {open ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      {open && (
        <nav className={styles.mobile}>
          <Link href="/products" className={styles.mobileLink} onClick={() => setOpen(false)}>{t('nav_products')}</Link>
          {user?.is_staff && (
            <Link href="/admin" className={styles.mobileLink} onClick={() => setOpen(false)}>{t('nav_admin')}</Link>
          )}
          
          {/* Mobile Language Switcher */}
          <div className={styles.mobileLangRow}>
            <button 
              onClick={() => { setLang('tj'); setOpen(false); }} 
              className={`${styles.mobileLangBtn} ${lang === 'tj' ? styles.mobileLangActive : ''}`}
            >
              Тоҷикӣ (TJ)
            </button>
            <button 
              onClick={() => { setLang('ru'); setOpen(false); }} 
              className={`${styles.mobileLangBtn} ${lang === 'ru' ? styles.mobileLangActive : ''}`}
            >
              Русский (RU)
            </button>
          </div>

          {user ? (
            <div className={styles.mobileUser}>
              <span className={styles.mobileUsername}>{user.name || user.phone}</span>
              <button onClick={() => { handleLogout(); setOpen(false); }} className={styles.mobileLogout}>
                <LogOut size={18} /> {t('nav_logout')}
              </button>
            </div>
          ) : (
            <Link href="/login" className={styles.mobileLink} onClick={() => setOpen(false)}>{t('nav_login')}</Link>
          )}
        </nav>
      )}
    </header>
  );
}
