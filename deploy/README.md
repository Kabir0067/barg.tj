# Barg.tj — Deployment

Production server snapshot of the infrastructure that runs **https://bargtj.softclub.win**.

## Architecture

```
Internet ──▶ Cloudflare ──▶ Docker nginx (apexhub_nginx, :80/:443)
                                 │   conf: deploy/nginx/barg.conf
                                 ├─ /            ─▶ 172.17.0.1:3001  (Next.js, barg-nextjs.service)
                                 ├─ /api/        ─▶ 172.17.0.1:8001  (Django/Gunicorn, barg-django.service)
                                 ├─ /site-admin/ ─▶ 172.17.0.1:8001  (Django admin)
                                 ├─ /media/      ─▶ 172.17.0.1:8001
                                 └─ /static/     ─▶ 172.17.0.1:8001
```

- **Code path:** `/var/www/barg.tj` (this git repo)
- **Backend:** Django 6 + DRF + SimpleJWT, Gunicorn (3 workers) on `:8001`, venv at `Back-End/.venv`, DB = SQLite (`Back-End/db.sqlite3`)
- **Frontend:** Next.js 16 (`next start`) on `:3001`
- **Services:** `barg-django.service`, `barg-nextjs.service` (run as `www-data`)
- **TLS:** Let's Encrypt at `/etc/letsencrypt/live/bargtj.softclub.win/`

## Files in this folder

| File | Server location |
|------|-----------------|
| `systemd/barg-django.service` | `/etc/systemd/system/barg-django.service` |
| `systemd/barg-nextjs.service` | `/etc/systemd/system/barg-nextjs.service` |
| `nginx/barg.conf` | inside `apexhub_nginx` container: `/etc/nginx/conf.d/barg.conf` (**active**) |
| `nginx/barg.softclub.win.host.conf` | `/etc/nginx/sites-available/barg.softclub.win` (legacy, inactive) |

## Deploy a new version

```bash
cd /var/www/barg.tj
git pull origin main

# backend
cd Back-End
. ./.env            # or rely on python-dotenv
.venv/bin/pip install -r requirements.txt
.venv/bin/python manage.py migrate --noinput
.venv/bin/python manage.py collectstatic --noinput

# frontend
cd ../Front-End
npm install
npm run build

# permissions + restart
chown -R www-data:www-data /var/www/barg.tj
systemctl restart barg-django barg-nextjs
```

> After every deploy, do a hard refresh (Ctrl+Shift+R) — JS chunk names change per build.

## Secrets (NOT committed)

`Back-End/.env` and `Front-End/.env.local` hold real secrets (Django `SECRET_KEY`,
Telegram bot token, Gemini/Groq/OpenRouter API keys, allowed hosts). They are
intentionally **kept out of git** — committing live keys to a remote repo exposes
them permanently (git history + scanners). See `Back-End/.env.example` for the
required variable names. Current production values:

- `DJANGO_ALLOWED_HOSTS=bargtj.softclub.win,www.bargtj.softclub.win,31.25.238.184,localhost`
- `NEXT_PUBLIC_API_URL=https://bargtj.softclub.win/api`

## Updating an infra config

Edit the file here, copy it to its server location, then:

```bash
# systemd
systemctl daemon-reload && systemctl restart barg-django barg-nextjs
# docker nginx
docker cp deploy/nginx/barg.conf apexhub_nginx:/etc/nginx/conf.d/barg.conf
docker exec apexhub_nginx nginx -t && docker exec apexhub_nginx nginx -s reload
```
