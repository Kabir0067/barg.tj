"use client";
import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Phone, Mail, MapPin, ShieldCheck, Award, Truck, Zap, Headphones, Clock, Navigation, X, ChevronRight } from 'lucide-react';
import styles from './Footer.module.css';

// Координатаҳои мағоза / Координаты магазина
const STORE_LAT = 39.501877;
const STORE_LON = 67.871782;
// Google Maps — нуқтаро дар харита нишон медиҳад
const GOOGLE_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${STORE_LAT},${STORE_LON}`;
// Yandex Navigator — масир месозад (rtext: lat,lon; ~ = аз ҷойгиршавии корбар)
const YANDEX_NAVI_URL = `https://yandex.ru/maps/?rtext=~${STORE_LAT}%2C${STORE_LON}&rtt=auto&z=17`;

export default function Footer() {
  const { lang, t } = useLanguage();
  const [mapOpen, setMapOpen] = useState(false);

  // Бо тугмаи Escape пӯшидан
  useEffect(() => {
    if (!mapOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMapOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mapOpen]);

  const trust = [
    {
      icon: <Truck size={26} />,
      title: lang === 'tj' ? 'Расонидани ройгон' : 'Бесплатная доставка',
      sub: lang === 'tj' ? 'барои хариди аз 5000 сомонӣ' : 'при заказе от 5000 сомони',
    },
    {
      icon: <Zap size={26} />,
      title: lang === 'tj' ? 'Расонидани зуд' : 'Быстрая доставка',
      sub: lang === 'tj' ? 'мустақиман ба дари хона' : 'прямо к вашему порогу',
    },
    {
      icon: <ShieldCheck size={26} />,
      title: lang === 'tj' ? 'Сифати кафолатнок' : 'Гарантия качества',
      sub: lang === 'tj' ? 'танҳо моли асил' : 'только оригинальный товар',
    },
    {
      icon: <Headphones size={26} />,
      title: lang === 'tj' ? 'Маслиҳати ройгон' : 'Бесплатная консультация',
      sub: lang === 'tj' ? 'ҳар рӯз бо шумо' : 'каждый день на связи',
    },
  ];

  return (
    <footer className={styles.footer}>
      {/* Trust / Value Bar */}
      <div className={styles.trustBar}>
        <div className={`container ${styles.trustGrid}`}>
          {trust.map((item, i) => (
            <div key={i} className={styles.trustItem}>
              <span className={styles.trustIcon}>{item.icon}</span>
              <div className={styles.trustText}>
                <span className={styles.trustTitle}>{item.title}</span>
                <span className={styles.trustSub}>{item.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Brand Partners Showcase */}
      <div className={styles.partnersSection}>
        <div className="container">
          <h4 className={styles.partnersTitle}>
            {lang === 'tj' ? 'Шарикони боэътимоди мо' : 'Наши надежные партнеры'}
          </h4>
          <div className={styles.partnersGrid}>
            <div className={styles.marqueeTrack} aria-hidden="false">
              <div className={styles.partnerCard}>
                <Award size={18} className={styles.partnerIcon} />
                <span>Huaxin Cement</span>
              </div>
              <div className={styles.partnerCard}>
                <Award size={18} className={styles.partnerIcon} />
                <span>Total Energies</span>
              </div>
              <div className={styles.partnerCard}>
                <Award size={18} className={styles.partnerIcon} />
                <span>Makita Tools</span>
              </div>
              <div className={styles.partnerCard}>
                <Award size={18} className={styles.partnerIcon} />
                <span>Bosch Power</span>
              </div>
              <div className={styles.partnerCard}>
                <Award size={18} className={styles.partnerIcon} />
                <span>Knauf Gypsum</span>
              </div>
              {/* Duplicate for seamless loop */}
              <div className={styles.partnerCard} aria-hidden="true">
                <Award size={18} className={styles.partnerIcon} />
                <span>Huaxin Cement</span>
              </div>
              <div className={styles.partnerCard} aria-hidden="true">
                <Award size={18} className={styles.partnerIcon} />
                <span>Total Energies</span>
              </div>
              <div className={styles.partnerCard} aria-hidden="true">
                <Award size={18} className={styles.partnerIcon} />
                <span>Makita Tools</span>
              </div>
              <div className={styles.partnerCard} aria-hidden="true">
                <Award size={18} className={styles.partnerIcon} />
                <span>Bosch Power</span>
              </div>
              <div className={styles.partnerCard} aria-hidden="true">
                <Award size={18} className={styles.partnerIcon} />
                <span>Knauf Gypsum</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Info */}
      <div className={styles.mainFooter}>
        <div className={`container ${styles.footerGrid}`}>
          {/* Col 1: Store Intro */}
          <div className={styles.col}>
            <div className={styles.brand}>
              <svg className={styles.logoIcon} viewBox="0 0 24 24" fill="currentColor">
                <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L7.5,18C11.24,18 16,15 17,8M3,2C11.5,2 17,5.5 21,12C14,12 9,9.5 3,2Z" />
              </svg>
              <span className={styles.logoText}>Barg.tj</span>
            </div>
            <p className={styles.desc}>
              {lang === 'tj' 
                ? 'Мағозаи масолеҳи сохтмонии деҳаи шумо. Мо молҳои босифатро мустақиман ва бе восита ба дари хонаи шумо мерасонем.'
                : 'Строительный магазин вашего села. Мы доставляем качественные товары напрямую к вашему порогу.'}
            </p>
          </div>

          {/* Col 2: Store Owner & Manager */}
          <div className={styles.col}>
            <h4>{lang === 'tj' ? 'Роҳбарият' : 'Руководство'}</h4>
            <div className={styles.contactItem}>
              <span className={styles.ownerLabel}>{lang === 'tj' ? 'Соҳибкор:' : 'Предприниматель:'}</span>
              <span className={styles.ownerName}>Бобоев Фирдавс</span>
            </div>
            <p className={styles.subtext}>
              {lang === 'tj'
                ? 'Барои ҳамкорӣ ва пешниҳодҳо метавонед мустақиман бо роҳбари мағоза дар тамос шавед.'
                : 'По вопросам сотрудничества и предложений вы можете связаться напрямую с владельцем магазина.'}
            </p>
          </div>

          {/* Col 3: Contacts */}
          <div className={styles.col}>
            <h4>{lang === 'tj' ? 'Алоқа' : 'Контакты'}</h4>
            <ul className={styles.contactsList}>
              <li>
                <a href="tel:+992928119002" className={styles.contactLink}>
                  <span className={styles.contactIco}><Phone size={17} /></span>
                  <span>+992 (92) 811-9002</span>
                </a>
              </li>
              <li>
                <a href="mailto:info@barg.tj" className={styles.contactLink}>
                  <span className={styles.contactIco}><Mail size={17} /></span>
                  <span>info@barg.tj</span>
                </a>
              </li>
              <li>
                <button type="button" className={styles.addressBtn} onClick={() => setMapOpen(true)}>
                  <span className={styles.contactIco}><MapPin size={17} /></span>
                  <span>{lang === 'tj' ? 'ш. Панҷакент, д. Ёрӣ' : 'г. Пенджикент, с. Ёри'}</span>
                </button>
              </li>
              <li>
                <div className={styles.contactLink}>
                  <span className={styles.contactIco}><Clock size={17} /></span>
                  <span>{lang === 'tj' ? 'Ҳар рӯз: 8:00 – 20:00' : 'Ежедневно: 8:00 – 20:00'}</span>
                </div>
              </li>
            </ul>
          </div>

          {/* Col 4: Socials */}
          <div className={styles.col}>
            <h4>{lang === 'tj' ? 'Шабакаҳои мо' : 'Мы в соцсетях'}</h4>
            <div className={styles.socials}>
              <a 
                href="https://instagram.com/barg.tj" 
                target="_blank" 
                rel="noreferrer" 
                className={styles.socialBtn} 
                aria-label="Instagram"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
              <a 
                href="https://t.me/barg_tj" 
                target="_blank" 
                rel="noreferrer" 
                className={styles.socialBtn} 
                aria-label="Telegram"
              >
                <svg className={styles.tgIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .24z"/>
                </svg>
              </a>
              <a 
                href="https://wa.me/992928119002" 
                target="_blank" 
                rel="noreferrer" 
                className={styles.socialBtn} 
                aria-label="WhatsApp"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
              </a>
            </div>
            <div className={styles.secureBadge}>
              <ShieldCheck size={18} />
              <span>{lang === 'tj' ? 'Маълумот ҳифз шудааст' : 'Данные защищены'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className={styles.copyrightBar}>
        <div className={`container ${styles.copyrightInner}`}>
          <p className={styles.copyText}>© {new Date().getFullYear()} Barg.tj. {lang === 'tj' ? 'Ҳамаи ҳуқуқҳо маҳфузанд.' : 'Все права защищены.'}</p>
          <a
            href="https://t.me/kabir_0067"
            target="_blank"
            rel="noreferrer"
            className={styles.credit}
            aria-label="Telegram: Gafurov Kabir"
          >
            <span className={styles.creditTg}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .24z"/>
              </svg>
            </span>
            <span className={styles.creditText}>
              {lang === 'tj' ? 'Тарроҳ ва барномасоз' : 'Разработка сайта'}
              <strong>Gafurov Kabir</strong>
            </span>
          </a>
        </div>
      </div>

      {/* Map / Navigation Modal */}
      {mapOpen && (
        <div className={styles.mapOverlay} onClick={() => setMapOpen(false)} role="dialog" aria-modal="true">
          <div className={styles.mapModal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.mapClose} onClick={() => setMapOpen(false)} aria-label={lang === 'tj' ? 'Пӯшидан' : 'Закрыть'}>
              <X size={20} />
            </button>

            <div className={styles.mapModalHead}>
              <span className={styles.mapPinBadge}>
                <MapPin size={28} />
              </span>
              <h3>{lang === 'tj' ? 'Масир ба мағоза' : 'Маршрут до магазина'}</h3>
              <p>{lang === 'tj' ? 'ш. Панҷакент, д. Ёрӣ' : 'г. Пенджикент, с. Ёри'}</p>
              <span className={styles.mapCoords}>{STORE_LAT}, {STORE_LON}</span>
            </div>

            <p className={styles.mapPrompt}>
              {lang === 'tj' ? 'Барномаро барои кушодани масир интихоб кунед' : 'Выберите приложение, чтобы открыть маршрут'}
            </p>

            <div className={styles.mapOptions}>
              <a
                href={GOOGLE_MAPS_URL}
                target="_blank"
                rel="noreferrer"
                className={`${styles.mapOption} ${styles.gmaps}`}
                onClick={() => setMapOpen(false)}
              >
                <span className={styles.mapOptionIcon}>
                  <MapPin size={24} />
                </span>
                <span className={styles.mapOptionText}>
                  <strong>Google Maps</strong>
                  <small>{lang === 'tj' ? 'Дар харита кушодан' : 'Открыть на карте'}</small>
                </span>
                <ChevronRight size={20} className={styles.mapOptionArrow} />
              </a>

              <a
                href={YANDEX_NAVI_URL}
                target="_blank"
                rel="noreferrer"
                className={`${styles.mapOption} ${styles.yandex}`}
                onClick={() => setMapOpen(false)}
              >
                <span className={styles.mapOptionIcon}>
                  <Navigation size={22} />
                </span>
                <span className={styles.mapOptionText}>
                  <strong>Yandex Navigator</strong>
                  <small>{lang === 'tj' ? 'Масир сохтан' : 'Построить маршрут'}</small>
                </span>
                <ChevronRight size={20} className={styles.mapOptionArrow} />
              </a>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
