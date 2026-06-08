"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { LayoutDashboard, Package, BrainCircuit, LogOut, Menu, X, Sun, Moon, ClipboardList, Receipt, Home } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import styles from './AdminLayout.module.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const token = Cookies.get('access_token');
    if (!token) {
      router.push('/admin-login');
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  const handleLogout = () => {
    Cookies.remove('access_token');
    router.push('/admin-login');
  };

  if (!isAuthorized) {
    return <div className={styles.loading}>{t('admin_loading')}</div>;
  }

  const menuItems = [
    { name: t('admin_nav_dashboard'), path: '/admin', icon: <LayoutDashboard size={20} /> },
    { name: t('admin_nav_orders'), path: '/admin/orders', icon: <ClipboardList size={20} /> },
    { name: t('admin_nav_sale'), path: '/admin/sale', icon: <Receipt size={20} /> },
    { name: t('admin_nav_products'), path: '/admin/products', icon: <Package size={20} /> },
    { name: t('admin_nav_ai'), path: '/admin/ai', icon: <BrainCircuit size={20} /> },
  ];

  return (
    <div className={styles.adminContainer}>
      {/* Mobile Sidebar Backdrop overlay */}
      {sidebarOpen && (
        <div className={styles.sidebarBackdrop} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
        <div className={styles.sidebarHeader}>
          <h2>Barg.tj Admin</h2>
          <button className={styles.mobileCloseBtn} onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className={styles.sidebarNav}>
          {menuItems.map((item) => (
            <Link 
              key={item.path} 
              href={item.path}
              className={`${styles.navItem} ${pathname === item.path ? styles.active : ''}`}
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <Link href="/" className={styles.homeBtn}>
            <Home size={18} />
            <span>{lang === 'ru' ? 'На главную' : 'Ба сайт'}</span>
          </Link>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={20} />
            <span>{t('admin_nav_logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={styles.mainContent}>
        <header className={styles.topbar}>
          <button className={styles.menuToggle} onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu size={24} />
          </button>

          <div className={styles.topbarRight}>
            {/* Language Selector */}
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

            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme} 
              className={styles.themeToggleBtn} 
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            <div className={styles.userProfile}>
              <div className={styles.avatar}>A</div>
              <span>{t('admin_nav_admin_role')}</span>
            </div>
          </div>
        </header>
        
        <main className={styles.pageContent}>
          {children}
        </main>
      </div>
    </div>
  );
}
