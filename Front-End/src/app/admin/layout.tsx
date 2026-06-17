"use client";
import React, { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';
import {
  LayoutDashboard, Package, BrainCircuit, LogOut, Menu, X, Sun, Moon,
  ClipboardList, Receipt, Home, PanelLeftClose, PanelLeftOpen, ChevronDown,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import Brand from '@/components/Brand';
import NotificationBell from '@/components/NotificationBell';
import styles from './AdminLayout.module.css';

const RAIL_KEY = 'admin_sidebar_collapsed';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  // Mobile slide-in drawer state (closed by default; backdrop only on mobile).
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Desktop icon-rail (collapsed) state — persisted in localStorage.
  const [collapsed, setCollapsed] = useState(false);
  // Avatar dropdown menu.
  const [menuOpen, setMenuOpen] = useState(false);
  // Mounted flag so theme-dependent UI renders only after hydration sync.
  const [mounted, setMounted] = useState(false);

  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = Cookies.get('access_token');
    if (!token) {
      router.push('/admin-login');
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  // Restore persisted icon-rail choice after mount.
  useEffect(() => {
    setMounted(true);
    try {
      if (localStorage.getItem(RAIL_KEY) === '1') setCollapsed(true);
    } catch { /* ignore */ }
  }, []);

  // Close the mobile drawer + avatar menu whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  // Esc closes drawer / avatar menu.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Click-outside closes the avatar menu.
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const handleLogout = () => {
    Cookies.remove('access_token');
    router.push('/admin-login');
  };

  const toggleRail = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(RAIL_KEY, next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  };

  if (!isAuthorized) {
    return (
      <div className={styles.loading}>
        <span className="spinner" aria-hidden />
        <span>{t('admin_loading')}</span>
      </div>
    );
  }

  const menuItems = [
    { name: t('admin_nav_dashboard'), path: '/admin', icon: <LayoutDashboard size={20} /> },
    { name: t('admin_nav_orders'), path: '/admin/orders', icon: <ClipboardList size={20} /> },
    { name: t('admin_nav_sale'), path: '/admin/sale', icon: <Receipt size={20} /> },
    { name: t('admin_nav_products'), path: '/admin/products', icon: <Package size={20} /> },
    { name: t('admin_nav_ai'), path: '/admin/ai', icon: <BrainCircuit size={20} /> },
  ];

  // Active route: exact match for the dashboard root, prefix match for sub-sections.
  const isActive = (path: string) =>
    path === '/admin' ? pathname === '/admin' : pathname === path || pathname.startsWith(path + '/');

  const activeItem = menuItems.find((m) => isActive(m.path));
  const pageTitle = activeItem?.name ?? 'Admin';
  const toSiteLabel = lang === 'ru' ? 'На главную' : 'Ба сайт';

  return (
    <div
      className={`${styles.adminContainer} ${collapsed ? styles.railMode : ''}`}
      data-collapsed={collapsed ? 'true' : 'false'}
    >
      {/* Mobile slide-in drawer backdrop */}
      <div
        className={`${styles.sidebarBackdrop} ${drawerOpen ? styles.backdropShow : ''}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden
      />

      {/* Sidebar */}
      <aside
        className={`${styles.sidebar} ${drawerOpen ? styles.sidebarOpen : ''}`}
        aria-label="Admin navigation"
      >
        <div className={styles.sidebarHeader}>
          <Link href="/admin" className={styles.brandLink} aria-label="Barg.tj Admin">
            <Brand size={52} href={null} />
            <span className={styles.brandAdmin}>Admin</span>
          </Link>
          <button
            className={styles.mobileCloseBtn}
            onClick={() => setDrawerOpen(false)}
            aria-label={lang === 'ru' ? 'Закрыть меню' : 'Пӯшидани меню'}
          >
            <X size={22} />
          </button>
        </div>

        <nav className={styles.sidebarNav} aria-label="Main">
          {menuItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`${styles.navItem} ${active ? styles.active : ''}`}
                aria-current={active ? 'page' : undefined}
                data-tooltip={item.name}
              >
                <span className={styles.navIcon} aria-hidden>{item.icon}</span>
                <span className={styles.navLabel}>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <Link href="/" className={styles.homeBtn} data-tooltip={toSiteLabel}>
            <span className={styles.navIcon} aria-hidden><Home size={18} /></span>
            <span className={styles.navLabel}>{toSiteLabel}</span>
          </Link>
          <button
            className={styles.logoutBtn}
            onClick={handleLogout}
            data-tooltip={t('admin_nav_logout')}
          >
            <span className={styles.navIcon} aria-hidden><LogOut size={18} /></span>
            <span className={styles.navLabel}>{t('admin_nav_logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={styles.mainContent}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            {/* Mobile: open drawer */}
            <button
              className={styles.menuToggle}
              onClick={() => setDrawerOpen(true)}
              aria-label={lang === 'ru' ? 'Открыть меню' : 'Кушодани меню'}
            >
              <Menu size={22} />
            </button>

            {/* Desktop: collapse to icon rail */}
            <button
              className={styles.railToggle}
              onClick={toggleRail}
              aria-label={collapsed
                ? (lang === 'ru' ? 'Развернуть меню' : 'Васеъ кардани меню')
                : (lang === 'ru' ? 'Свернуть меню' : 'Ҷамъ кардани меню')}
              aria-pressed={collapsed}
            >
              {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>

            <div className={styles.breadcrumb}>
              <span className={styles.crumbRoot}>Admin</span>
              <span className={styles.crumbSep} aria-hidden>/</span>
              <span className={styles.crumbCurrent}>{pageTitle}</span>
            </div>
          </div>

          <div className={styles.topbarRight}>
            {/* Notification Bell */}
            <NotificationBell />

            {/* Language Selector */}
            <div className={styles.langSwitch} role="group" aria-label="Language">
              <button
                onClick={() => setLang('tj')}
                className={`${styles.langBtn} ${lang === 'tj' ? styles.langActive : ''}`}
                aria-pressed={lang === 'tj'}
              >
                TJ
              </button>
              <button
                onClick={() => setLang('ru')}
                className={`${styles.langBtn} ${lang === 'ru' ? styles.langActive : ''}`}
                aria-pressed={lang === 'ru'}
              >
                RU
              </button>
            </div>

            {/* Theme Toggle — render both icons; CSS shows the right one per data-theme.
                Guarded with `mounted` so the icon swap can't cause a hydration mismatch. */}
            <button
              onClick={toggleTheme}
              className={styles.iconBtn}
              aria-label={lang === 'ru' ? 'Сменить тему' : 'Тағйири мавзӯъ'}
              title={lang === 'ru' ? 'Тема' : 'Мавзӯъ'}
            >
              {mounted ? (
                theme === 'light' ? <Moon size={18} /> : <Sun size={18} />
              ) : (
                <span className={styles.iconPlaceholder} aria-hidden />
              )}
            </button>

            {/* Avatar menu */}
            <div className={styles.userMenu} ref={menuRef}>
              <button
                className={styles.avatarBtn}
                onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={t('admin_nav_admin_role')}
              >
                <span className={styles.avatar}>A</span>
                <span className={styles.avatarMeta}>
                  <span className={styles.avatarRole}>{t('admin_nav_admin_role')}</span>
                  <span className={styles.avatarSub}>Barg.tj</span>
                </span>
                <ChevronDown
                  size={16}
                  className={`${styles.chevron} ${menuOpen ? styles.chevronUp : ''}`}
                  aria-hidden
                />
              </button>

              {menuOpen && (
                <div className={styles.dropdown} role="menu">
                  <div className={styles.dropdownHeader}>
                    <span className={styles.avatar} aria-hidden>A</span>
                    <div className={styles.dropdownIdent}>
                      <strong>{t('admin_nav_admin_role')}</strong>
                      <span>Barg.tj</span>
                    </div>
                  </div>
                  <div className={styles.dropdownDivider} />
                  <Link href="/" className={styles.dropdownItem} role="menuitem">
                    <Home size={17} aria-hidden />
                    <span>{toSiteLabel}</span>
                  </Link>
                  <button
                    className={`${styles.dropdownItem} ${styles.dropdownDanger}`}
                    onClick={handleLogout}
                    role="menuitem"
                  >
                    <LogOut size={17} aria-hidden />
                    <span>{t('admin_nav_logout')}</span>
                  </button>
                </div>
              )}
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
