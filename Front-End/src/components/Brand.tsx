"use client";
import React from 'react';
import Link from 'next/link';
import styles from './Brand.module.css';

type Variant = 'auto' | 'light' | 'dark';

interface BrandProps {
  /** Rendered logo height in px (width auto, logo is square). */
  size?: number;
  /** Wrap in a Link to this href. Pass null to render a plain element. */
  href?: string | null;
  /** Eager-load (use for the header instance). */
  priority?: boolean;
  /**
   * auto  -> follows the active theme (black wordmark on light, white on dark)
   * light -> always the black-wordmark logo (for light surfaces)
   * dark  -> always the white-wordmark logo (for dark / colored / brand surfaces)
   */
  variant?: Variant;
  className?: string;
  onClick?: () => void;
}

export default function Brand({
  size = 40,
  href = '/',
  priority = false,
  variant = 'auto',
  className = '',
  onClick,
}: BrandProps) {
  const dim = { height: size, width: 'auto' as const };
  const loading = priority ? ('eager' as const) : ('lazy' as const);

  const content = (
    <span className={styles.mark} aria-label="Barg.tj" role="img">
      {variant !== 'dark' && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src="/logo.png"
          alt="Barg.tj"
          width={600}
          height={600}
          style={dim}
          loading={loading}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          className={variant === 'auto' ? styles.light : styles.solo}
          draggable={false}
        />
      )}
      {variant !== 'light' && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src="/logo-dark.png"
          alt="Barg.tj"
          width={600}
          height={600}
          style={dim}
          loading={loading}
          decoding="async"
          className={variant === 'auto' ? styles.dark : styles.solo}
          draggable={false}
        />
      )}
    </span>
  );

  if (href === null) {
    return <span className={`${styles.brand} ${className}`} onClick={onClick}>{content}</span>;
  }

  return (
    <Link href={href} className={`${styles.brand} ${className}`} aria-label="Barg.tj" onClick={onClick}>
      {content}
    </Link>
  );
}
