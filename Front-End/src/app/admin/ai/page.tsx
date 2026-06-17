"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';
import {
  BrainCircuit, Send, User, Copy, Check, Plus,
  TrendingUp, Package, DollarSign, BarChart3, Sparkles,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import styles from './AdminAI.module.css';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
};

const SESSION_KEY = 'barg_admin_ai_session_v1';

/* ── Suggested analytics prompts (inline i18n) ── */
const PROMPTS = {
  tj: [
    { icon: TrendingUp, text: 'Кадом маҳсулот бештар фоида овард?' },
    { icon: DollarSign, text: 'Даромади ин моҳ чанд аст?' },
    { icon: Package, text: 'Кадом молҳо дар анбор кам мондаанд?' },
    { icon: BarChart3, text: 'Ҳисоботи фурӯши ҳафтаи охирро нишон деҳ' },
  ],
  ru: [
    { icon: TrendingUp, text: 'Какой товар принёс больше всего прибыли?' },
    { icon: DollarSign, text: 'Какая выручка за этот месяц?' },
    { icon: Package, text: 'Какие товары заканчиваются на складе?' },
    { icon: BarChart3, text: 'Покажи отчёт продаж за последнюю неделю' },
  ],
} as const;

/* ── Time formatter (locale-aware, stable) ── */
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

/* ──────────────────────────────────────────────
   Safe inline "markdown-ish" renderer.
   Escapes first → tokenizes a tiny subset into React
   nodes. NO dangerouslySetInnerHTML on model output.
   Supports: **bold**, *italic*, `inline code`,
   - / * bullet lists, 1. numbered lists, links, line breaks.
─────────────────────────────────────────────── */
const URL_RE = /(https?:\/\/[^\s<>()]+[^\s<>().,!?])/g;

function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Split on the marker tokens while keeping them.
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
      // linkify plain text segments
      const subParts = part.split(URL_RE);
      subParts.forEach((sp, j) => {
        if (!sp) return;
        if (URL_RE.test(sp)) {
          nodes.push(
            <a key={`${key}-l${j}`} href={sp} target="_blank" rel="noopener noreferrer" className={styles.link}>
              {sp}
            </a>
          );
          URL_RE.lastIndex = 0;
        } else {
          nodes.push(<React.Fragment key={`${key}-t${j}`}>{sp}</React.Fragment>);
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
      if (line.trim() === '') {
        blocks.push(<div key={`sp-${key++}`} className={styles.mdSpacer} />);
      } else {
        blocks.push(<p key={`p-${key++}`} className={styles.mdPara}>{renderInline(line, `p-${key}`)}</p>);
      }
    }
  });
  flushList();
  return <>{blocks}</>;
}

export default function AdminAIPage() {
  const { lang, t } = useLanguage();
  const toast = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const greeting = (): Message => ({ role: 'assistant', content: t('admin_ai_greeting'), ts: Date.now() });

  // Hydrate from sessionStorage once (decoupled from lang so switching lang keeps history)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Message[];
        if (Array.isArray(parsed) && parsed.length) {
          setMessages(parsed);
          setHydrated(true);
          return;
        }
      }
    } catch { /* ignore corrupt session */ }
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto-grow textarea
  const autoGrow = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);
  useEffect(() => { autoGrow(); }, [input, autoGrow]);

  const send = useCallback(async (text: string) => {
    const userMsg = text.trim();
    if (!userMsg || isLoading) return;
    setInput('');

    const base: Message[] = [...messages, { role: 'user', content: userMsg, ts: Date.now() }];
    setMessages(base);
    setIsLoading(true);

    try {
      const res = await apiClient.post('/ai/admin-query/', { message: userMsg, lang });
      setMessages([...base, { role: 'assistant', content: res.data.response, ts: Date.now() }]);
    } catch {
      setMessages([
        ...base,
        {
          role: 'assistant',
          content: lang === 'tj' ? 'Хатогӣ ҳангоми иртибот бо сервери ИИ.' : 'Ошибка при связи с сервером ИИ.',
          ts: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, lang]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const newChat = () => {
    setMessages([greeting()]);
    setInput('');
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* noop */ }
    textareaRef.current?.focus();
  };

  const copyMsg = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      toast.success(lang === 'tj' ? 'Нусха бардошта шуд' : 'Скопировано');
      window.setTimeout(() => setCopiedIdx((c) => (c === idx ? null : c)), 1800);
    } catch {
      toast.error(lang === 'tj' ? 'Нусхабардорӣ нашуд' : 'Не удалось скопировать');
    }
  };

  const prompts = PROMPTS[lang] || PROMPTS.tj;
  const showPrompts = hydrated && messages.length <= 1 && !isLoading;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <BrainCircuit size={26} />
        </div>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t('admin_ai_title')}</h1>
          <p className={styles.subtitle}>{t('admin_ai_subtitle')}</p>
        </div>
        <button
          type="button"
          className={styles.newChatBtn}
          onClick={newChat}
          aria-label={lang === 'tj' ? 'Сӯҳбати нав' : 'Новый чат'}
        >
          <Plus size={18} />
          <span>{lang === 'tj' ? 'Сӯҳбати нав' : 'Новый чат'}</span>
        </button>
      </div>

      <div className={styles.chatContainer}>
        <div className={styles.chatBody}>
          {!hydrated ? (
            <div className={styles.bootSkeleton} aria-hidden="true">
              <div className={`${styles.skelRow} ${styles.skelBot}`}>
                <div className={`skeleton ${styles.skelAvatar}`} />
                <div className={`skeleton ${styles.skelBubble}`} />
              </div>
              <div className={`${styles.skelRow} ${styles.skelUser}`}>
                <div className={`skeleton ${styles.skelBubbleSm}`} />
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`${styles.messageWrapper} ${msg.role === 'user' ? styles.userWrapper : styles.botWrapper}`}
              >
                <div className={`${styles.avatar} ${msg.role === 'user' ? styles.userAvatar : styles.botAvatar}`}>
                  {msg.role === 'user' ? <User size={18} /> : <BrainCircuit size={18} />}
                </div>
                <div className={styles.msgCol}>
                  <div className={`${styles.message} ${msg.role === 'user' ? styles.userMsg : styles.botMsg}`}>
                    {msg.role === 'assistant'
                      ? <MarkdownText content={msg.content} />
                      : <span className={styles.plainText}>{msg.content}</span>}
                  </div>
                  <div className={styles.msgMeta}>
                    <span className="tnum">{formatTime(msg.ts, lang)}</span>
                    {msg.role === 'assistant' && (
                      <button
                        type="button"
                        className={styles.copyBtn}
                        onClick={() => copyMsg(msg.content, i)}
                        aria-label={lang === 'tj' ? 'Нусха бардоштан' : 'Копировать'}
                      >
                        {copiedIdx === i ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copiedIdx === i
                          ? (lang === 'tj' ? 'Нусха шуд' : 'Скопировано')
                          : (lang === 'tj' ? 'Нусха' : 'Копир.')}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className={`${styles.messageWrapper} ${styles.botWrapper}`}>
              <div className={`${styles.avatar} ${styles.botAvatar}`}>
                <BrainCircuit size={18} />
              </div>
              <div className={styles.msgCol}>
                <div className={`${styles.message} ${styles.botMsg} ${styles.loadingMsg}`}>
                  <span className={styles.dots} aria-label={t('admin_ai_typing')}>
                    <span /><span /><span />
                  </span>
                </div>
              </div>
            </div>
          )}

          {showPrompts && (
            <div className={styles.promptsWrap}>
              <div className={styles.promptsLabel}>
                <Sparkles size={14} />
                <span>{lang === 'tj' ? 'Намунаи саволҳо' : 'Примеры запросов'}</span>
              </div>
              <div className={styles.promptsGrid}>
                {prompts.map((p, idx) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={styles.promptChip}
                      onClick={() => send(p.text)}
                    >
                      <span className={styles.promptIcon}><Icon size={16} /></span>
                      <span className={styles.promptText}>{p.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={onSubmit} className={styles.chatFooter}>
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder={t('admin_ai_placeholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            className={styles.input}
            disabled={isLoading}
            aria-label={t('admin_ai_placeholder')}
          />
          <button
            type="submit"
            className={`btn-primary ${styles.sendBtn}`}
            disabled={!input.trim() || isLoading}
            aria-label={t('admin_ai_send')}
          >
            <Send size={18} />
            <span>{t('admin_ai_send')}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
