"use client";
import React, { useEffect, useRef, useState } from 'react';

interface RevealProps {
  children: React.ReactNode;
  /** stagger delay in ms */
  delay?: number;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
  /** re-trigger every time it enters (default: once) */
  once?: boolean;
}

/**
 * Wraps content with a scroll-into-view reveal. Pairs with the global
 * .reveal / .is-visible classes in globals.css (which respect reduced-motion).
 */
export default function Reveal({ children, delay = 0, className = '', as = 'div', once = true }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) obs.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [once]);

  const Tag = as as React.ElementType;
  return (
    <Tag
      ref={ref}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
