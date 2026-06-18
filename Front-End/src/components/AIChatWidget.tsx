"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle, X, Send, Copy, Check, RotateCcw } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useLanguage } from '@/context/LanguageContext';
import styles from './AIChatWidget.module.css';

type Msg = { role: 'user' | 'assistant'; content: string; ts: number };

const SESSION_KEY = 'barg_ai_widget_session_v1';

const SUGGESTIONS = {
  tj: [
    'Кадом маҳсулотҳоро доред?',
    'Нархи семент чанд аст?',
    'Шартҳои дастраскунӣ чӣ гуна аст?',
  ],
  ru: [
    'Какие товары есть в наличии?',
    'Сколько стоит цемент?',
    'Какие условия доставки?',
  ],
} as const;

/* Time formatter (locale-aware) */
function formatTime(ts: number, lang: string): string {
  try {
    return new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'tg-TJ', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts));
  } catch {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
}

/* ── Safe inline markdown renderer (escapes via React text nodes; no dangerouslySetInnerHTML) ── */
const URL_RE = /(https?:\/\/[^\s<>()]+[^\s<>().,!?])/g;

function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*)/g;
  const parts = text.split(regex);
  parts.forEach((part, i) => {
    if (!part) return;
    const key = `${keyBase}-${i}`;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      nodes.push(<strong key={key}>{part.slice(2, -2)}</strong>);
    } else if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      nodes.push(<code key={key} className={styles.inlineCode}>{part.slice(1, -1)}</code>);
    } else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      nodes.push(<em key={key}>{part.slice(1, -1)}</em>);
    } else {
      const subParts = part.split(URL_RE);
      subParts.forEach((sp, j) => {
        if (!sp) return;
        if (URL_RE.test(sp)) {
          nodes.push(
            <a key={`${key}-l${j}`} href={sp} target="_blank" rel="noopener noreferrer" className={styles.link}>{sp}</a>
          );
          URL_RE.lastIndex = 0;
        } else {
          nodes.push(<span key={`${key}-t${j}`}>{sp}</span>);
        }
      });
    }
  });
  return nodes;
}

function MarkdownText({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let listBuffer: { ordered: boolean; items: string[] } | null = null;
  let key = 0;

  const flushList = () => {
    if (!listBuffer) return;
    const { ordered, items } = listBuffer;
    const ListTag = ordered ? 'ol' : 'ul';
    blocks.push(
      React.createElement(
        ListTag,
        { key: `list-${key++}`, className: styles.mdList },
        items.map((it, idx) => <li key={idx}>{renderInline(it, `li-${key}-${idx}`)}</li>)
      )
    );
    listBuffer = null;
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet) {
      if (listBuffer && !listBuffer.ordered) listBuffer.items.push(bullet[1]);
      else { flushList(); listBuffer = { ordered: false, items: [bullet[1]] }; }
    } else if (ordered) {
      if (listBuffer && listBuffer.ordered) listBuffer.items.push(ordered[1]);
      else { flushList(); listBuffer = { ordered: true, items: [ordered[1]] }; }
    } else {
      flushList();
      if (line.trim() === '') blocks.push(<div key={`sp-${key++}`} className={styles.mdSpacer} />);
      else blocks.push(<p key={`p-${key++}`} className={styles.mdPara}>{renderInline(line, `p-${key}`)}</p>);
    }
  });
  flushList();
  return <>{blocks}</>;
}

export default function AIChatWidget() {
  const { lang, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [chatId, setChatId] = useState(0);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);

  const pathname = usePathname();
  const onCart = pathname === '/cart';

  const greeting = useCallback((): Msg => ({ role: 'assistant', content: t('ai_greeting'), ts: Date.now() }), [t]);

  // Hydrate session once (decoupled from lang → switching language keeps history)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Msg[];
        if (Array.isArray(parsed) && parsed.length) {
          setMessages(parsed);
          setHydrated(true);
          return;
        }
      }
    } catch { /* ignore */ }
    setMessages([greeting()]);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist session
  useEffect(() => {
    if (!hydrated) return;
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages)); } catch { /* quota */ }
  }, [messages, hydrated]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, open]);

  // Auto-grow textarea
  const autoGrow = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);
  useEffect(() => { autoGrow(); }, [input, autoGrow]);

  // Mobile scroll-lock + Esc-to-close + focus mgmt while open
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    const isMobile = window.matchMedia('(max-width: 480px)').matches;
    if (isMobile) document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);

    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 120);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(focusTimer);
    };
  }, [open]);

  // Return focus to FAB after closing
  useEffect(() => {
    if (!open) fabRef.current?.focus({ preventScroll: true });
  }, [open]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const newMsgs: Msg[] = [...messages, { role: 'user', content: trimmed, ts: Date.now() }];
    setMessages(newMsgs);
    setLoading(true);

    try {
      const res = await apiClient.post('/ai/chat/', {
        message: trimmed,
        history: newMsgs.slice(-8).map((m) => ({ role: m.role, content: m.content })),
        lang,
      });
      setMessages([...newMsgs, { role: 'assistant', content: res.data.response, ts: Date.now() }]);
    } catch {
      setMessages([...newMsgs, { role: 'assistant', content: t('ai_error'), ts: Date.now() }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, lang, t]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    send(input);
    setInput('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!input.trim()) return;
      send(input);
      setInput('');
    }
  };

  const newChat = () => {
    setChatId(c => c + 1);
    setMessages([greeting()]);
    setInput('');
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* noop */ }
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const copyMsg = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      window.setTimeout(() => setCopiedIdx((c) => (c === idx ? null : c)), 1600);
    } catch { /* clipboard blocked */ }
  };

  if (!open) {
    return (
      <button ref={fabRef} className={`${styles.fab} ${onCart ? styles.fabAboveBar : ''}`} onClick={() => setOpen(true)} title={t('ai_title')} aria-label={t('ai_title')}>
        <MessageCircle size={28} className={styles.fabIcon} />
        <span className={styles.pulseRing} aria-hidden="true"></span>
      </button>
    );
  }

  const activeSuggestions = SUGGESTIONS[lang] || SUGGESTIONS.tj;
  const showSuggestions = hydrated && messages.length <= 1 && !loading;

  return (
    <div className={styles.window} role="dialog" aria-modal="true" aria-label={t('ai_title')} translate="no">
      <div className={styles.head}>
        <div className={styles.headLeft}>
          <div className={styles.avatar}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt={t('ai_title')}
              className={styles.avatarIcon}
              width={120}
              height={120}
              style={{ height: '28px', width: 'auto', objectFit: 'contain' }}
              draggable={false}
            />
          </div>
          <div className={styles.headText}>
            <div className={styles.headName}>{t('ai_title')}</div>
            <div className={styles.status}>
              <span className={styles.statusDot}></span>
              <span>{t('ai_status')}</span>
            </div>
          </div>
        </div>
        <div className={styles.headActions}>
          <button
            onClick={newChat}
            className={styles.headBtn}
            aria-label={lang === 'tj' ? 'Сӯҳбати нав' : 'Новый чат'}
            title={lang === 'tj' ? 'Сӯҳбати нав' : 'Новый чат'}
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={() => setOpen(false)}
            className={styles.headBtn}
            aria-label={lang === 'tj' ? 'Пӯшидан' : 'Закрыть'}
            title={lang === 'tj' ? 'Пӯшидан' : 'Закрыть'}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className={styles.body} key={chatId}>
        {messages.map((m, i) => (
          <div key={`${m.role}-${m.ts}-${i}`} className={`${styles.messageRow} ${m.role === 'user' ? styles.userRow : styles.botRow}`}>
            {m.role === 'assistant' && (
              <div className={styles.botMiniAvatar}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  alt="Barg.tj"
                  width={60}
                  height={60}
                  style={{ height: '16px', width: 'auto', objectFit: 'contain' }}
                  draggable={false}
                />
              </div>
            )}
            <div className={styles.msgCol}>
              <div className={styles.msg}>
                {m.role === 'assistant'
                  ? <MarkdownText content={m.content} />
                  : <span className={styles.plainText}>{m.content}</span>}
              </div>
              <div className={styles.msgMeta}>
                <span className="tnum">{formatTime(m.ts, lang)}</span>
                {m.role === 'assistant' && (
                  <button
                    type="button"
                    className={styles.copyBtn}
                    onClick={() => copyMsg(m.content, i)}
                    aria-label={lang === 'tj' ? 'Нусха бардоштан' : 'Копировать'}
                  >
                    {copiedIdx === i ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className={`${styles.messageRow} ${styles.botRow}`}>
            <div className={styles.botMiniAvatar}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Barg.tj"
                width={60}
                height={60}
                style={{ height: '16px', width: 'auto', objectFit: 'contain' }}
                draggable={false}
              />
            </div>
            <div className={`${styles.msg} ${styles.typing}`}>
              <span className={styles.dots} aria-label={t('ai_typing')}>
                <span /><span /><span />
              </span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {showSuggestions && (
        <div className={styles.suggestions}>
          {activeSuggestions.map((s, idx) => (
            <button key={idx} className={styles.suggestBtn} onClick={() => send(s)}>
              <span>{s}</span>
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.foot}>
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t('ai_placeholder')}
          aria-label={t('ai_placeholder')}
          disabled={loading}
          className={styles.input}
        />
        <button type="submit" disabled={!input.trim() || loading} className={styles.sendBtn} aria-label={t('ai_title')}>
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
