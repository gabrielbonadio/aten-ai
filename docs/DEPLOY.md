# Deploy — Aten AI

Guia para colocar o Aten AI no ar **com HTTPS**, sem versionar secrets.

Stack sugerida:

| Peça | PaaS (recomendado para demo) | Self-hosted (VPS) |
|------|------------------------------|-------------------|
| MySQL | Railway / Aiven | Docker Compose (`mysql`) |
| API (Node) | Render / Railway / Fly.io | Compose `backend` |
| Frontend | Vercel / Netlify | Compose `frontend` + **Caddy** (TLS) |

O backend usa **MySQL** (`mysql2` + Sequelize). Evite Postgres sem migration de dialeto.

---

## HTTPS (obrigatório em produção)

Não exponha a API ou o portal só em HTTP na internet.

### Opção A — PaaS

1. Configure **custom domain** no Render/Vercel/Netlify.
2. Ative HTTPS (os provedores emitem certificado automaticamente).
3. Defina:
   - `FRONTEND_URL=https://seu-portal.exemplo.com` (sem `/` final)
   - `API_URL=https://sua-api.exemplo.com` (build do frontend)
4. Redeploy. Confirme cadeado no browser e HSTS no painel do provedor (quando disponível).

### Opção B — VPS + Caddy (Let's Encrypt)

Arquivos no repo:

- `docker-compose.yml` — app
- `docker-compose.tls.yml` — serviço Caddy
- `deploy/Caddyfile` — rotas SPA + API no mesmo domínio

Passos:

1. DNS A/AAAA de `DOMAIN` → IP da VPS (portas **80** e **443** abertas).
2. No `.env` da raiz:

```env
DOMAIN=app.seudominio.com
ACME_EMAIL=voce@seudominio.com
FRONTEND_URL=https://app.seudominio.com
API_URL=https://app.seudominio.com
JWT_SECRET=...   # ≥ 32 chars, sem placeholder
N8N_WEBHOOK_SECRET=...
DB_PASS=...
MYSQL_ROOT_PASSWORD=...
```

3. Subir:

```bash
docker compose -f docker-compose.yml -f docker-compose.tls.yml up -d --build
```

4. Em produção, evite publicar `3000`/`8080` no host — só o Caddy precisa de 80/443.

5. Smoke: `https://$DOMAIN/health` e login no portal.

---

## O que NÃO colocar no repositório

- `.env` com `JWT_SECRET`, `DB_PASS`, `RESEND_API_KEY`, `N8N_WEBHOOK_SECRET`
- dumps `.sql` / pasta `backups/` com dados reais
- tokens GitHub / chaves Resend

Configure secrets no painel do provedor ou no `.env` local (gitignored).

---

## Checklist de variáveis

### Backend

| Variável | Nota |
|----------|------|
| `NODE_ENV` | `production` |
| `PORT` | PaaS injeta; Compose usa `3000` |
| `DB_*` | MySQL gerenciado ou Compose |
| `DB_POOL_MAX` | Ajuste conforme réplicas (padrão Compose: 10) |
| `JWT_SECRET` | ≥ 32 chars, **nunca** placeholder |
| `JWT_EXPIRES_IN` | `1h` (refresh cobre a sessão longa) |
| `FRONTEND_URL` | URL **https** do portal (CORS + e-mails) |
| `ENABLE_IN_PROCESS_JOBS` | `true` numa réplica; `false` + `npm run worker` se scale-out |
| `EMAIL_FROM` / `RESEND_API_KEY` | Opcional |
| `N8N_*` | Vazio se não usar WhatsApp |
| `PII_ENCRYPTION_KEY` | Recomendado: `openssl rand -hex 32` — cifra sintomas/diagnóstico/prescrição (ver `docs/LGPD.md`) |
| `SENTRY_DSN` | Opcional — erros 5xx e exceções não tratadas |
| `SENTRY_TRACES_SAMPLE_RATE` | Opcional — padrão `0.1` em production |

### Frontend (build)

| Variável | Nota |
|----------|------|
| `API_URL` | URL **https** da API (sem barra final). No Caddy same-host, use o mesmo `DOMAIN`. |
| `SENTRY_DSN` | Opcional — erros no browser (build Docker / `sync:env`) |

---

## Passo a passo — Render (API) + Vercel (portal)

### 1. MySQL

Crie MySQL (Railway/Aiven). Anote host, porta, user, password, database.

### 2. Web Service (backend)

1. Root Directory: `backend`
2. Build: `npm ci && npm run build`
3. Start: `npm run start:prod` (migrate + server)
4. Env vars da tabela acima (`FRONTEND_URL` = URL https do Vercel)
5. `GET https://<api>/health`

### 3. Frontend (Vercel)

1. Root Directory: `frontend`
2. Build com replace de `API_URL` (ver abaixo) + `npm run build`
3. Output: `dist/aten-ai-portal/browser`
4. `API_URL=https://<sua-api>.onrender.com`

```bash
node -e "const fs=require('fs');const u=process.env.API_URL;fs.writeFileSync('src/environments/environment.production.ts',\`export const environment={production:true,apiUrl:'\${u}'};\`);" && npm run build
```

### 4. CORS

`FRONTEND_URL` no backend = URL exata do portal (https, sem `/`). Redeploy da API.

---

## Backups MySQL

Scripts no repo:

- Linux/macOS: `scripts/backup-mysql.sh`
- Windows: `scripts/backup-mysql.ps1`

```bash
# Linux (Compose rodando)
chmod +x scripts/backup-mysql.sh
./scripts/backup-mysql.sh
```

```powershell
# Windows
.\scripts\backup-mysql.ps1
```

Dumps em `backups/aten_ai_*.sql.gz` (pasta gitignored). Retenção padrão: **7 dias**.

### Restore

```bash
gunzip -c backups/aten_ai_YYYYMMDDTHHMMSSZ.sql.gz | \
  docker compose exec -T mysql mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME"
```

Agende no cron (Linux) ou Task Scheduler (Windows) diariamente.

---

## Smoke test pós-deploy

1. `GET /health` → 200  
2. Signup / login no portal (access + refresh)  
3. Listar pets / tutores / agenda  
4. (Opcional) n8n: header `Authorization: Bearer <N8N_WEBHOOK_SECRET>` alinhado ao `.env`

Swagger `/api-docs` fica **desligado** em `NODE_ENV=production`.

---

## Custos e limites free tier

- Render free pode “dormir” (cold start).
- Ajuste `DB_POOL_MAX` se houver várias réplicas.
- Não use a demo com dados reais de pacientes/clientes (LGPD).

---

## Depois do go-live

- [ ] Backup automático testado (restore feito ao menos uma vez)
- [ ] Domínio custom + HTTPS
- [ ] `N8N_WEBHOOK_SECRET` na UI do n8n (passo externo)
- [ ] CI com `npm audit` + Dependabot (`.github/`)
- [ ] Monitoramento: `/health`, `/metrics` e Sentry (ver abaixo)

---

## Observabilidade e alertas

Endpoints expostos pela API (sem auth — restrinja na borda se necessário):

| Endpoint | Uso |
|----------|-----|
| `GET /health` | Liveness/readiness; **503** quando MySQL indisponível |
| `GET /metrics` | Snapshot JSON: contadores HTTP (`responses5xx`, etc.) + última execução dos jobs (`found`/`sent`/`failed`) |

### Sentry (opcional)

1. Crie projeto no [Sentry](https://sentry.io) (Node + Browser).
2. Backend/worker: `SENTRY_DSN=https://…` no `.env`.
3. Frontend: `SENTRY_DSN` no build (`frontend/.env` + `npm run sync:env`, ou `ARG SENTRY_DSN` no Docker).
4. Erros **5xx** no `errorHandler` são enviados automaticamente quando o DSN está definido.

Variáveis:

```env
SENTRY_DSN=
SENTRY_TRACES_SAMPLE_RATE=0.1
```

### Alertas mínimos recomendados

Configure no seu monitor (UptimeRobot, Datadog, CloudWatch, Grafana, etc.):

| Alerta | Condição | Severidade |
|--------|----------|------------|
| API indisponível | `GET /health` ≠ 200 por **2 checks** consecutivos | Crítico |
| Banco down | `GET /health` → **503** ou `checks.database.status != up` | Crítico |
| Taxa de erro 5xx | `GET /metrics` → `http.responses5xx / http.requestsTotal > 0.05` (5%) em janela de 15 min | Alto |
| Job com falhas | `GET /metrics` → job `failed > 0` após execução diária | Médio |
| Sentry | Novo issue ou spike de eventos | Alto |

Logs estruturados JSON (`LOG_LEVEL=info` em production) complementam métricas e Sentry — ingestão via stdout do container/PaaS.
