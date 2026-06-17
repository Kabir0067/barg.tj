"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { ShoppingCart, Menu, X, Shield, LogOut, Sun, Moon, User, Package, ChevronRight } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import Brand from './Brand';
import NotificationBell from './NotificationBell';
import styles from './Navbar.module.css';

const TajikFlag = () => (
  <svg viewBox="0 0 21 14" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', borderRadius: '50%', display: 'block' }}>
    <rect width="21" height="4" fill="#cc0c2f" />
    <rect width="21" height="6" y="4" fill="#fff" />
    <rect width="21" height="4" y="10" fill="#00975e" />
    <g transform="translate(10.5, 7) scale(0.65)" fill="#f1b516">
      <path d="M -3,2 L 3,2 L 2.5,1 L -2.5,1 Z" />
      <path d="M -2.5,1 C -2,1 -1.5,0 -1.5,-1 C -1.5,0 -0.5,0.5 0,0 C 0.5,0.5 1.5,0 1.5,-1 C 1.5,0 2,1 2.5,1 Z" />
      <path d="M -1,-1 C -1,-2 1,-2 1,-1 L 0.7,-0.7 C 0.7,-1.5 -0.7,-1.5 -0.7,-0.7 Z" />
      <circle cx="-3" cy="-1.5" r="0.4" />
      <circle cx="-2.3" cy="-2.5" r="0.4" />
      <circle cx="-1.3" cy="-3.2" r="0.4" />
      <circle cx="0" cy="-3.5" r="0.4" />
      <circle cx="1.3" cy="-3.2" r="0.4" />
      <circle cx="2.3" cy="-2.5" r="0.4" />
      <circle cx="3" cy="-1.5" r="0.4" />
    </g>
  </svg>
);

const RussianFlag = () => (
  <svg viewBox="0 0 3 2" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', borderRadius: '50%', display: 'block' }}>
    <rect width="3" height="2" fill="#fff" />
    <rect width="3" height="1.333" y="0.667" fill="#0039a6" />
    <rect width="3" height="0.667" y="1.333" fill="#d52b1e" />
  </svg>
);

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
        <Brand size={52} priority />


        <nav className={styles.desktop}>
          <Link href="/products" className={styles.link}>{t('nav_products')}</Link>
          
          {user?.is_staff && (
            <>
              <Link href="/admin" className={styles.adminLink}>
                <Shield size={16} /> {t('nav_admin')}
              </Link>
              <NotificationBell />
            </>
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
            <div className={styles.switchTrack}>
              <div className={`${styles.switchThumb} ${lang === 'ru' ? styles.switchThumbRu : ''}`} />
              <button 
                onClick={() => setLang('tj')} 
                className={`${styles.switchOption} ${lang === 'tj' ? styles.optionActive : ''}`}
                title="Тоҷикӣ"
                type="button"
              >
                <div className={styles.flagWrapper}>
                  <TajikFlag />
                </div>
              </button>
              <button 
                onClick={() => setLang('ru')} 
                className={`${styles.switchOption} ${lang === 'ru' ? styles.optionActive : ''}`}
                title="Русский"
                type="button"
              >
                <div className={styles.flagWrapper}>
                  <RussianFlag />
                </div>
              </button>
            </div>
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
          {user?.is_staff && <NotificationBell />}
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
              <Brand size={58} variant="auto" onClick={() => setOpen(false)} />
              <div className={styles.drawerHeaderActions}>
                <div className={styles.switchTrack}>
                  <div className={`${styles.switchThumb} ${lang === 'ru' ? styles.switchThumbRu : ''}`} />
                  <button 
                    onClick={() => { setLang('tj'); setOpen(false); }}
                    className={`${styles.switchOption} ${lang === 'tj' ? styles.optionActive : ''}`}
                    title="Тоҷикӣ"
                    type="button"
                  >
                    <div className={styles.flagWrapper}>
                      <TajikFlag />
                    </div>
                  </button>
                  <button 
                    onClick={() => { setLang('ru'); setOpen(false); }}
                    className={`${styles.switchOption} ${lang === 'ru' ? styles.optionActive : ''}`}
                    title="Русский"
                    type="button"
                  >
                    <div className={styles.flagWrapper}>
                      <RussianFlag />
                    </div>
                  </button>
                </div>
                <button className={styles.drawerClose} onClick={() => setOpen(false)}>
                  <X size={20} />
                </button>
              </div>
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

            {/* User section */}
            {user ? (
              <div className={styles.drawerUserSection}>
                <div className={styles.drawerUserCard}>
                  <div className={styles.drawerUserAvatar}>
                    {(user.name || user.phone || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className={styles.drawerUserName}>{user.name || user.phone}</div>
                    <div className={styles.drawerUserSub}>
                      {user.is_staff 
                        ? (lang === 'tj' ? 'Администратор' : 'Администратор')
                        : (lang === 'tj' ? 'Клиент / Муштарӣ' : 'Покупатель')}
                    </div>
                  </div>
                </div>
                <button onClick={() => { handleLogout(); setOpen(false); }} className={styles.drawerLogoutBtn}>
                  <LogOut size={18} />
                  <span>{t('nav_logout')}</span>
                </button>
              </div>
            ) : (
              <div className={styles.drawerLoginContainer}>
                <Link href="/login" className={styles.drawerLoginBtn} onClick={() => setOpen(false)}>
                  <User size={20} />
                  <span>{t('nav_login')}</span>
                  <ChevronRight size={16} className={styles.drawerLoginArrow} />
                </Link>
                <Link href="/admin-login" className={styles.drawerAdminLoginBtn} onClick={() => setOpen(false)}>
                  <Shield size={16} />
                  <span>{lang === 'tj' ? 'Воридшавии админ' : 'Вход для админа'}</span>
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
