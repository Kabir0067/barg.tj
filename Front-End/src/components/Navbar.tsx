"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { ShoppingCart, Menu, X, Shield, LogOut, Sun, Moon, User, Package, ChevronRight } from 'lucide-react';
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
          <svg className={styles.logoIcon} width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="#047857"/>
            <path d="M16 5C16 5 25 9.5 25 18.5C25 23.5 21 27 16 27C16 27 16.5 19 8 14.5C8 14.5 9.5 5 16 5Z" fill="white" opacity="0.95"/>
            <path d="M16 27L16 15" stroke="#047857" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
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
        <div className={styles.mobileOverlay} onClick={() => setOpen(false)}>
          <nav className={styles.mobileDrawer} onClick={(e) => e.stopPropagation()}>
            {/* Drawer header */}
            <div className={styles.drawerHeader}>
              <Link href="/" className={styles.drawerLogo} onClick={() => setOpen(false)}>
                <svg className={styles.logoIcon} width="26" height="26" viewBox="0 0 32 32" fill="none">
                  <rect width="32" height="32" rx="8" fill="#047857"/>
                  <path d="M16 5C16 5 25 9.5 25 18.5C25 23.5 21 27 16 27C16 27 16.5 19 8 14.5C8 14.5 9.5 5 16 5Z" fill="white" opacity="0.95"/>
                  <path d="M16 27L16 15" stroke="#047857" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                <span>Barg.tj</span>
              </Link>
              <button className={styles.drawerClose} onClick={() => setOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Navigation links */}
            <div className={styles.drawerNav}>
              <Link href="/products" className={styles.drawerLink} onClick={() => setOpen(false)}>
                <Package size={20} />
                <span>{t('nav_products')}</span>
                <ChevronRight size={16} className={styles.drawerArrow} />
              </Link>
              {user?.is_staff && (
                <Link href="/admin" className={`${styles.drawerLink} ${styles.drawerLinkAdmin}`} onClick={() => setOpen(false)}>
                  <Shield size={20} />
                  <span>{t('nav_admin')}</span>
                  <ChevronRight size={16} className={styles.drawerArrow} />
                </Link>
              )}
            </div>

            <div className={styles.drawerDivider} />

            {/* Language section */}
            <div className={styles.drawerLangSection}>
              <span className={styles.drawerSectionLabel}>Язык / Забон</span>
              <div className={styles.drawerLangBtns}>
                <button
                  onClick={() => { setLang('tj'); setOpen(false); }}
                  className={`${styles.drawerLangBtn} ${lang === 'tj' ? styles.drawerLangActive : ''}`}
                >
                  Тоҷикӣ (TJ)
                </button>
                <button
                  onClick={() => { setLang('ru'); setOpen(false); }}
                  className={`${styles.drawerLangBtn} ${lang === 'ru' ? styles.drawerLangActive : ''}`}
                >
                  Русский (RU)
                </button>
              </div>
            </div>

            <div className={styles.drawerDivider} />

            {/* User section */}
            {user ? (
              <div className={styles.drawerUserSection}>
                <div className={styles.drawerUserCard}>
                  <div className={styles.drawerUserAvatar}>
                    {(user.name || user.phone || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className={styles.drawerUserName}>{user.name || user.phone}</div>
                    <div className={styles.drawerUserSub}>Клиент / Муштарӣ</div>
                  </div>
                </div>
                <button onClick={() => { handleLogout(); setOpen(false); }} className={styles.drawerLogoutBtn}>
                  <LogOut size={18} />
                  <span>{t('nav_logout')}</span>
                </button>
              </div>
            ) : (
              <Link href="/login" className={styles.drawerLoginBtn} onClick={() => setOpen(false)}>
                <User size={20} />
                <span>{t('nav_login')}</span>
                <ChevronRight size={16} className={styles.drawerLoginArrow} />
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
