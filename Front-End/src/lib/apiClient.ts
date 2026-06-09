import axios from 'axios';
import Cookies from 'js-cookie';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

// Origin of the backend (бе /api) — барои расмҳои бор кардашуда
export const MEDIA_ORIGIN = BASE_URL.replace(/\/api\/?$/, '');

// URL-и пурраи расм месозад (новобаста ба он ки сервер роҳи нисбӣ ё пурра медиҳад)
export function mediaUrl(path?: string | null): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${MEDIA_ORIGIN}${path}`;
}

// Расмҳои омодаи категорияҳо (дар public/categories/) — барои зебоии саҳифаҳо
const CATEGORY_IMAGES = new Set([
  'cement', 'paints', 'tools', 'plumbing', 'electrical',
  'metal', 'flooring', 'construction', 'other',
]);

// Барои ҳар категория акси мувофиқ бармегардонад; агар номаълум бошад — акси "дигар"
export function categoryImage(slug?: string | null): string {
  if (slug && CATEGORY_IMAGES.has(slug)) return `/categories/${slug}.jpg`;
  return '/categories/other.jpg';
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = Cookies.get('access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // FormData-ро browser худаш Content-Type + boundary мегузорад — ману дастак назан
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  } else if (!config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('access_token');
      // Redirect to admin-login only when on admin pages; public pages handle it locally
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
        window.location.href = '/admin-login';
      }
    }
    return Promise.reject(error);
  }
);
