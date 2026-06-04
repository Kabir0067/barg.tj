"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { Shield } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import styles from './AdminLogin.module.css';
import Link from 'next/link';

export default function AdminLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('+992');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 9 || !password) {
      setError('Рақами телефон ва парол ҳатмист');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await apiClient.post('/token/', { phone, password });
      const { access, refresh } = res.data;
      
      if (access) {
        Cookies.set('access_token', access, { expires: 7 }); 
        window.location.href = '/admin'; 
      }
    } catch (err: any) {
      console.error(err);
      setError('Рақами телефон ё парол нодуруст аст, ё шумо ҳуқуқи администратор надоред.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <div className={styles.iconWrapper}>
          <Shield size={32} strokeWidth={1.5} />
        </div>
        <h1 className={styles.title}>Администратор</h1>
        <p className={styles.subtitle}>Барои вуруд ба панели идоракунӣ маълумоти худро ворид кунед</p>

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Рақами телефон</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+992 00 000 0000"
              className={styles.input}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Парол (Password)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={styles.input}
              required
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" className={`btn-primary ${styles.submitBtn}`} disabled={loading}>
            {loading ? 'Дар ҳоли санҷиш...' : 'Ворид шудан'}
          </button>
        </form>
        
        <div className={styles.footerLink}>
          <Link href="/">Бозгашт ба мағоза</Link>
        </div>
      </div>
    </div>
  );
}
