"use client";
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Leaf, Sparkles } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useLanguage } from '@/context/LanguageContext';
import styles from './AIChatWidget.module.css';

type Msg = { role: 'user' | 'assistant'; content: string };

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
  ]
};

export default function AIChatWidget() {
  const { lang, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Initialize greeting on mount/lang change
  useEffect(() => {
    setMessages([
      { 
        role: 'assistant', 
        content: t('ai_greeting')
      }
    ]);
  }, [lang]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;

    const newMsgs: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages(newMsgs);
    setLoading(true);

    try {
      const res = await apiClient.post('/ai/chat/', {
        message: text,
        history: newMsgs.slice(-8),
        lang: lang, // Send current selected language to AI
      });
      setMessages([...newMsgs, { role: 'assistant', content: res.data.response }]);
    } catch {
      setMessages([
        ...newMsgs, 
        { role: 'assistant', content: t('ai_error') }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    send(input);
    setInput('');
  };

  if (!open) {
    return (
      <button className={styles.fab} onClick={() => setOpen(true)} title={t('ai_title')}>
        <MessageCircle size={28} className={styles.fabIcon} />
        <span className={styles.pulseRing}></span>
      </button>
    );
  }

  const activeSuggestions = SUGGESTIONS[lang] || SUGGESTIONS.tj;

  return (
    <div className={styles.window}>
      <div className={styles.head}>
        <div className={styles.headLeft}>
          <div className={styles.avatar}>
            <Leaf size={20} className={styles.avatarIcon} fill="#fff" />
          </div>
          <div>
            <div className={styles.headName}>{t('ai_title')}</div>
            <div className={styles.status}>
              <span className={styles.statusDot}></span>
              <span>{t('ai_status')}</span>
            </div>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className={styles.closeBtn} aria-label="Пӯшидан">
          <X size={22} />
        </button>
      </div>

      <div className={styles.body}>
        {messages.map((m, i) => (
          <div key={i} className={`${styles.messageRow} ${m.role === 'user' ? styles.userRow : styles.botRow}`}>
            {m.role === 'assistant' && (
              <div className={styles.botMiniAvatar}>
                <Leaf size={12} fill="var(--brand-primary)" />
              </div>
            )}
            <div className={styles.msg}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className={`${styles.messageRow} ${styles.botRow}`}>
            <div className={styles.botMiniAvatar}>
              <Leaf size={12} fill="var(--brand-primary)" />
            </div>
            <div className={`${styles.msg} ${styles.typing}`}>
              <Sparkles size={16} className={styles.typingIcon} />
              <span>{t('ai_typing')}</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {messages.length === 1 && !loading && (
        <div className={styles.suggestions}>
          {activeSuggestions.map((s, idx) => (
            <button 
              key={idx} 
              className={styles.suggestBtn}
              onClick={() => send(s)}
            >
              <span>{s}</span>
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.foot}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={t('ai_placeholder')}
        />
        <button type="submit" disabled={!input.trim() || loading} className={styles.sendBtn}>
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
