"use client";
import React, { useState, useRef, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import { BrainCircuit, Send, User, Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import styles from './AdminAI.module.css';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function AdminAIPage() {
  const { lang, t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize greeting after t is available
  useEffect(() => {
    setMessages([
      { role: 'assistant', content: t('admin_ai_greeting') }
    ]);
  }, [lang]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    
    const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Admin query to backend (it reads live DB state under the hood)
      const res = await apiClient.post('/ai/admin-query/', {
        message: userMsg,
        lang: lang
      });

      setMessages([...newMessages, { role: 'assistant', content: res.data.response }]);
    } catch (err) {
      console.error("Admin AI error", err);
      setMessages([...newMessages, { role: 'assistant', content: lang === 'tj' ? 'Хатогӣ ҳангоми иртибот бо сервери ИИ.' : 'Ошибка при связи с сервером ИИ.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <BrainCircuit size={28} />
        </div>
        <div>
          <h1 className={styles.title}>{t('admin_ai_title')}</h1>
          <p className={styles.subtitle}>{t('admin_ai_subtitle')}</p>
        </div>
      </div>

      <div className={styles.chatContainer}>
        <div className={styles.chatBody}>
          {messages.map((msg, i) => (
            <div key={i} className={`${styles.messageWrapper} ${msg.role === 'user' ? styles.userWrapper : styles.botWrapper}`}>
              <div className={`${styles.avatar} ${msg.role === 'user' ? styles.userAvatar : styles.botAvatar}`}>
                {msg.role === 'user' ? <User size={20} /> : <BrainCircuit size={20} />}
              </div>
              <div className={`${styles.message} ${msg.role === 'user' ? styles.userMsg : styles.botMsg}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className={`${styles.messageWrapper} ${styles.botWrapper}`}>
              <div className={`${styles.avatar} ${styles.botAvatar}`}>
                <BrainCircuit size={20} />
              </div>
              <div className={`${styles.message} ${styles.botMsg} ${styles.loadingMsg}`}>
                <Loader2 size={20} className={styles.spinner} />
                {t('admin_ai_typing')}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className={styles.chatFooter}>
          <input
            type="text"
            placeholder={t('admin_ai_placeholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className={styles.input}
          />
          <button type="submit" className={`btn-primary ${styles.sendBtn}`} disabled={!input.trim() || isLoading}>
            <Send size={20} />
            <span>{t('admin_ai_send')}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
