"use client";
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import styles from './Confirm.module.css';

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | undefined>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmFn>((o) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback((result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOpts(null);
  }, []);

  useEffect(() => {
    if (!opts) return;
    confirmBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Enter') close(true);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [opts, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <div className={styles.overlay} onClick={() => close(false)} role="dialog" aria-modal="true">
          <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <div className={`${styles.iconWrap} ${opts.danger ? styles.danger : ''}`}>
              <AlertTriangle size={26} />
            </div>
            <h3 className={styles.title}>{opts.title}</h3>
            {opts.message && <p className={styles.message}>{opts.message}</p>}
            <div className={styles.actions}>
              <button className={styles.cancel} onClick={() => close(false)}>
                {opts.cancelText || 'Бекор'}
              </button>
              <button
                ref={confirmBtnRef}
                className={`${styles.confirm} ${opts.danger ? styles.confirmDanger : ''}`}
                onClick={() => close(true)}
              >
                {opts.confirmText || 'Тасдиқ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx;
}
