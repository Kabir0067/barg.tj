// Shared number/currency formatting so prices read "12 500 сом." consistently
// across the storefront, cart, PDP, orders and the admin dashboard.

const nf = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isFinite(n) ? n : 0;
}

/** Grouped integer, e.g. 12500 -> "12 500" */
export function formatNumber(value: number | string | null | undefined): string {
  return nf.format(toNumber(value));
}

/** Price with currency suffix, e.g. 12500 -> "12 500 сом." */
export function formatPrice(value: number | string | null | undefined, suffix = 'сом.'): string {
  return `${nf.format(toNumber(value))} ${suffix}`;
}

/** Two-decimal money, e.g. 12500 -> "12 500,00" (for invoices/receipts) */
export function formatMoney(value: number | string | null | undefined): string {
  return nf2.format(toNumber(value));
}

/** Compact large values, e.g. 12_500_000 -> "12,5 млн" */
export function formatCompact(value: number | string | null | undefined): string {
  const n = toNumber(value);
  if (Math.abs(n) >= 1_000_000) return `${nf2.format(n / 1_000_000)} млн`;
  if (Math.abs(n) >= 1_000) return `${nf.format(Math.round(n / 100) / 10)} тыс`;
  return nf.format(n);
}

const unitTranslations: Record<string, { tj: string; ru: string }> = {
  'дона': { tj: 'дона', ru: 'шт' },
  'шт': { tj: 'дона', ru: 'шт' },
  'шт.': { tj: 'дона', ru: 'шт' },
  'штука': { tj: 'дона', ru: 'шт' },
  
  'маҷум': { tj: 'маҷум', ru: 'комплект' },
  'маҷмӯъ': { tj: 'маҷмӯъ', ru: 'комплект' },
  'комплект': { tj: 'маҷмӯъ', ru: 'комплект' },
  
  'ғалтак': { tj: 'ғалтак', ru: 'рулон' },
  'рулон': { tj: 'ғалтак', ru: 'рулон' },
  
  'халта': { tj: 'халта', ru: 'мешок' },
  'мешок': { tj: 'халта', ru: 'мешок' },
  
  'метр': { tj: 'метр', ru: 'м' },
  'м': { tj: 'метр', ru: 'м' },
  'м.': { tj: 'метр', ru: 'м' },
  
  'кг': { tj: 'кг', ru: 'кг' },
  'килограмм': { tj: 'кг', ru: 'кг' },
  
  'литр': { tj: 'литр', ru: 'л' },
  'л': { tj: 'литр', ru: 'л' },
};

export function formatUnit(unit: string | null | undefined, lang: 'tj' | 'ru'): string {
  if (!unit) return lang === 'tj' ? 'дона' : 'шт';
  const clean = unit.trim().toLowerCase();
  const match = unitTranslations[clean];
  if (match) {
    return match[lang];
  }
  return unit;
}
