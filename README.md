# 🍃 Barg.tj

**Barg.tj** — мағозаи онлайни масолеҳи сохтмонии деҳа. Дорои каталоги маҳсулот, сабади харид, фармоиш бо огоҳии Telegram, дастёри ИИ, панели идоракунӣ бо аналитика — дузабона (тоҷикӣ 🇹🇯 / русӣ 🇷🇺), бо реҷаи рӯшну торик ва тарҳи mobile-first.

> Online store for a village construction-materials shop — catalog, cart, Telegram order notifications, AI assistant, and an admin dashboard with analytics. Bilingual (Tajik / Russian), dark mode, mobile-first.

---

## 🧱 Технологияҳо / Tech stack

| | |
|---|---|
| **Back-End** | Django 6 · Django REST Framework · SimpleJWT · SQLite |
| **Front-End** | Next.js 16 · React 19 · TypeScript · CSS Modules |
| **Integrations** | Telegram Bot API · AI fallback (Gemini → Groq → OpenRouter) |

---

## 🚀 Оғоз / Getting started

### 1. Back-End (Django)

```bash
cd Back-End
python -m venv .venv
.venv\Scripts\activate            # Windows
# source .venv/bin/activate       # macOS / Linux
pip install -r requirements.txt

# Сирҳоро танзим кунед / configure secrets:
copy .env.example .env            # Windows  (cp on macOS/Linux)
# .env-ро бо қиматҳои воқеӣ пур кунед

python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

API → `http://127.0.0.1:8000/`

### 2. Front-End (Next.js)

```bash
cd Front-End
npm install
copy .env.example .env.local      # NEXT_PUBLIC_API_URL-ро танзим кунед
npm run dev
```

Сайт → `http://localhost:3000/`

---

## 🔐 Сирҳо / Environment variables

Ҳеҷ калиди сирӣ дар код нест — ҳама аз `.env` хонда мешавад (нигаред ба `Back-End/.env.example`):

- `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`

> ⚠️ Файли `.env` ҳаргиз ба git дохил намешавад (gitignore-шуда). Дар production тавассути муҳити сервер танзим кунед.

---

## ✨ Имкониятҳо / Features

- 🛒 Каталог, ҷустуҷӯ, филтр аз рӯи категория, сабад ва фармоиш
- 📲 Огоҳии фармоиш ба Telegram + камшавии худкори захира
- 🤖 Дастёри ИИ бо 3 провайдер (fallback)
- 📊 Панели админ: аналитика, графикҳо, идораи маҳсулот ва фармоишҳо, фурӯши POS
- 🌗 Реҷаи рӯшну торик · 🇹🇯/🇷🇺 дузабона · 📱 mobile-first

---

## 👨‍💻 Муаллиф / Author

**Gafurov Kabir** — тарроҳӣ ва барномасозӣ
Telegram: [@kabir_0067](https://t.me/kabir_0067)
