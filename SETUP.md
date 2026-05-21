# Setup Guide — flowpro.dev на твоём сервере

Server: `ubuntu@146.59.92.14` (OVH VPS, Ubuntu 24.04)  
Architecture: Docker reverse-proxy nginx в `/srv/infrastructure/nginx/`

---

## Шаг 1. DNS — GoDaddy

В GoDaddy → DNS для `flowpro.dev`:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 146.59.92.14 | 600 |
| A | www | 146.59.92.14 | 600 |

Подождать 5–15 минут.

---

## Шаг 2. Папка для сайта

```bash
ssh ubuntu@146.59.92.14
mkdir -p /srv/apps/flowpro-dev
```

---

## Шаг 3. Добавить volume в nginx docker-compose

Открыть `/srv/infrastructure/nginx/docker-compose.yml` и добавить строку в секцию `volumes` (рядом с landing и portfolio):

```yaml
      - /srv/apps/flowpro-dev:/srv/apps/flowpro-dev:ro
```

---

## Шаг 4. Добавить nginx конфиг (без SSL — для получения сертификата)

Сначала временный конфиг только для HTTP (certbot нужен HTTP для challenge):

```bash
cat > /srv/infrastructure/nginx/conf.d/flowpro.conf << 'EOF'
server {
    listen 80;
    server_name flowpro.dev www.flowpro.dev;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 "ok";
    }
}
EOF
```

Перезапустить nginx контейнер:

```bash
cd /srv/infrastructure/nginx
docker compose restart nginx
```

---

## Шаг 5. Получить SSL сертификат

```bash
certbot certonly \
  --webroot \
  -w /srv/infrastructure/nginx/webroot \
  -d flowpro.dev \
  -d www.flowpro.dev \
  --email ivan@flowpro.dev \
  --agree-tos \
  --non-interactive
```

---

## Шаг 6. Заменить конфиг на финальный

```bash
cp /path/to/nginx/flowpro.conf /srv/infrastructure/nginx/conf.d/flowpro.conf
```

Или скопировать содержимое файла `nginx/flowpro.conf` из этого репозитория.

Перезапустить nginx:

```bash
cd /srv/infrastructure/nginx
docker compose restart nginx
```

---

## Шаг 7. SSH ключ для GitHub Actions

На своём компьютере:

```bash
ssh-keygen -t ed25519 -C "github-actions-flowpro" -f ~/.ssh/flowpro_deploy -N ""
```

Добавить публичный ключ на сервер:

```bash
ssh ubuntu@146.59.92.14 "echo '$(cat ~/.ssh/flowpro_deploy.pub)' >> ~/.ssh/authorized_keys"
```

---

## Шаг 8. GitHub Secrets

Создать репозиторий на GitHub, затем:  
`Settings → Secrets and variables → Actions → New repository secret`

| Secret name | Value |
|-------------|-------|
| `SERVER_SSH_KEY` | Содержимое `~/.ssh/flowpro_deploy` (приватный ключ, всё включая `-----BEGIN...`) |

IP и user зашиты прямо в `deploy.yml` — secrets не нужны для них.

---

## Шаг 9. Первый деплой

```bash
cd flowpro-deploy/
git init
git add .
git commit -m "Initial: flowpro.dev landing"
git remote add origin https://github.com/YOUR_USERNAME/flowpro-deploy.git
git branch -M main
git push -u origin main
```

GitHub Actions скопирует `public/index.html` → `/srv/apps/flowpro-dev/` автоматически.

---

## Обновление сайта в будущем

```bash
# Отредактировать public/index.html
git add public/index.html
git commit -m "Update landing"
git push
# Сайт обновится через ~20 секунд
```
