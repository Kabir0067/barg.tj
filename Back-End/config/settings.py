import os
from pathlib import Path
from datetime import timedelta


def env_bool(key, default=False):
    return os.environ.get(key, str(default)).strip().lower() in ('1', 'true', 'yes', 'on')


def env_list(key, default):
    raw = os.environ.get(key)
    if not raw:
        return default
    return [item.strip() for item in raw.split(',') if item.strip()]


BASE_DIR = Path(__file__).resolve().parent.parent

# Load local .env (gitignored) so secrets stay OUT of source control.
# In production, set real environment variables on the host instead.
try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / '.env')
except ImportError:
    pass

# --- Core security (override via environment variables in production) ---
SECRET_KEY = os.environ.get(
    'DJANGO_SECRET_KEY',
    'django-insecure-d)&0@x))bxr%y8)+@uw7*(j6ws8=)yzo59(n3j^k!y(^-e)u3o'
)
DEBUG = env_bool('DJANGO_DEBUG', True)
ALLOWED_HOSTS = env_list('DJANGO_ALLOWED_HOSTS', ['*', 'localhost', '127.0.0.1', 'barg.tj', 'www.barg.tj'])


INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',
    'corsheaders',
    'drf_spectacular',
    'rest_framework_simplejwt',

    'api',
    'analytics',
    'ai_assistant',
]


MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    # WhiteNoise serves static files in production (added below if installed)
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny', 
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}


AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=365),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=700),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
}


SPECTACULAR_SETTINGS = {
    'TITLE': 'Barg.tj Строительный Гипермаркет API',
    'DESCRIPTION': (
        '## 🏗️ Официальное REST API строительного гипермаркета Barg.tj\n\n'
        'Данный интерфейс предназначен для интеграции с фронтендом (Web/Mobile), '
        'системами складского учёта (1С / ERP) и CRM. Обеспечивает высокую скорость '
        'работы с каталогом товаров, корзиной, заказами и профилями пользователей.\n\n'
        '### 🔑 Авторизация:\n'
        '* Для клиентских и административных запросов используется **JWT (Bearer Token)**.\n'
        '* Передавайте токен в заголовке: `Authorization: Bearer <ваш_токен>`.\n\n'
        '### 📦 Ключевые модули:\n'
        '* **Каталог:** Фильтрация по категориям, брендам, характеристикам строительных материалов.\n'
        '* **Склад:** Актуальные остатки товаров на складах и интеграция цен.\n'
        '* **Заказы:** Оформление доставки, расчёт объёма/веса и статусы оплаты.'
    ),
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

LANGUAGE_CODE = 'ru-tj'
TIME_ZONE = 'Asia/Dushanbe'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Serve static files efficiently in production via WhiteNoise (if installed)
try:
    import whitenoise  # noqa: F401
    MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
    STORAGES = {
        'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
        'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage'},
    }
except ImportError:
    pass

# --- CORS / CSRF ---
# Дар реҷаи кориӣ (DEBUG) ҳамаро иҷозат медиҳем; дар production танҳо доменҳои худро.
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOW_ALL_ORIGINS = False
    CORS_ALLOWED_ORIGINS = env_list(
        'CORS_ALLOWED_ORIGINS',
        ['https://barg.tj', 'https://www.barg.tj'],
    )
CSRF_TRUSTED_ORIGINS = env_list(
    'CSRF_TRUSTED_ORIGINS',
    ['https://barg.tj', 'https://www.barg.tj'],
)

# Media files (uploaded product images)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Custom user model for phone-based logins
AUTH_USER_MODEL = 'api.Customer'

# --- Production security hardening (active only when DEBUG=False) ---
if not DEBUG:
    SECURE_SSL_REDIRECT = env_bool('SECURE_SSL_REDIRECT', True)
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True

# Telegram Integration Configuration
# Танзимоти Телеграм барои фиристодани супоришҳо ба коргарон
# Real values live in Back-End/.env (gitignored) or host environment variables.
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID = os.environ.get('TELEGRAM_CHAT_ID', '')  # Ид-и гурӯҳи коргарони мағоза

# ИИ (AI Assistant) API Keys — set via environment, never hard-code here
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
GROQ_API_KEY = os.environ.get('GROQ_API_KEY', '')
OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY', '')

