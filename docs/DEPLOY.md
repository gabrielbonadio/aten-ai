# Deploy demo (Onda 7) — Aten AI

Guia para colocar uma **demo pública** no ar (portfólio / entrevista), sem versionar secrets.

Stack sugerida (free tier):

| Peça | Serviço sugerido | Alternativa |
|------|------------------|-------------|
| MySQL | [Railway](https://railway.app) ou [Aiven](https://aiven.io) free | PlanetScale (MySQL-compatible) / Render Postgres* |
| API (Node) | [Render](https://render.com) Web Service | Railway / Fly.io |
| Frontend (Angular) | [Vercel](https://vercel.com) ou [Netlify](https://netlify.com) | Cloudflare Pages |

\*O backend atual usa **MySQL** (`mysql2` + Sequelize). Evite Postgres sem migration de dialeto.

> Nesta onda **não** é obrigatório ligar n8n/WhatsApp reais. A demo do portal + API + login já basta para entrevista.

---

## O que NÃO colocar no repositório

- `.env` com `JWT_SECRET`, `DB_PASS`, `RESEND_API_KEY`, `N8N_WEBHOOK_SECRET`
- dumps `.sql` / `.db` com dados reais de clínicas
- tokens GitHub / chaves Resend

Configure tudo no painel do provedor (Environment Variables).

---

## Checklist de variáveis

### Backend (Render / Railway)

| Variável | Exemplo / nota |
|----------|----------------|
| `NODE_ENV` | `production` |
| `PORT` | Render injeta automaticamente; não force se o painel já define |
| `DB_HOST` | Host do MySQL gerenciado |
| `DB_PORT` | `3306` (ou a do provedor) |
| `DB_USER` / `DB_PASS` / `DB_NAME` | Credenciais do MySQL |
| `JWT_SECRET` | String longa **nova**, só de produção (≥ 32 chars) |
| `JWT_EXPIRES_IN` | `7d` |
| `FRONTEND_URL` | URL pública do portal (ex.: `https://aten-ai.vercel.app`) — usada em CORS e e-mails |
| `EMAIL_FROM` / `RESEND_API_KEY` | Opcional na demo; reset de senha sem isso só loga no console |
| `N8N_*` | Deixe vazio na demo se não for ligar WhatsApp |

### Frontend (Vercel / Netlify)

No **build**, o Angular production usa `environment.production.ts` com placeholder `__API_URL__`.

Opções:

1. **Build arg / replace no CI** (recomendado no Docker — já existe `sync`/nginx no compose), ou  
2. **Build local/CI com replace** do placeholder pela URL da API, ou  
3. Temporário: editar `environment.production.ts` **só no painel de build** via script:

```bash
# Exemplo em build command (Vercel)
node -e "const fs=require('fs');const u=process.env.API_URL;fs.writeFileSync('src/environments/environment.production.ts',\`export const environment={production:true,apiUrl:'\${u}'};\`);" && npm run build
```

Defina `API_URL=https://sua-api.onrender.com` (sem barra no final).

---

## Passo a passo — Render (API) + MySQL

### 1. Banco MySQL

1. Crie um MySQL no Railway/Aiven/Render (se disponível).
2. Anote host, porta, user, password, database.
3. Libere acesso externo (IP allowlist / “public network”) para o serviço da API.

### 2. Web Service (backend)

1. New → Web Service → conecte o repo `gabrielbonadio/aten-ai`.
2. **Root Directory:** `backend`
3. **Build Command:** `npm ci && npm run build`
4. **Start Command:** `npm run start:prod`  
   (`start:prod` já roda `sequelize-cli db:migrate` + `node dist/server.js`)
5. Preencha as env vars da tabela acima.
6. Deploy → teste: `GET https://<sua-api>/health`

### 3. Frontend (Vercel)

1. Import repo → **Root Directory:** `frontend`
2. Framework: Angular (ou Other)
3. Build: use o one-liner de replace + `npm run build` (seção acima)
4. Output: `dist/aten-ai-portal/browser` (Angular 17 application builder)  
   Confirme a pasta após um `npm run build` local — se for `dist/aten-ai-portal`, ajuste.
5. Env: `API_URL=https://<sua-api>.onrender.com`
6. Deploy → abra a URL → login/signup.

### 4. Ligar CORS

1. No backend, `FRONTEND_URL` = URL exata do Vercel (https, sem `/` final).
2. Redeploy da API.
3. No browser (DevTools → Network), confirme que as chamadas à API não falham por CORS.

---

## Smoke test pós-deploy

1. `GET /health` → 200  
2. `POST /auth/signup` (tenant + admin)  
3. `POST /auth/login` → JWT  
4. Abrir portal → dashboard com token  
5. (Opcional) Swagger: `https://<api>/api-docs`

---

## Custos e limites free tier

- Render free **dorme** após inatividade (~50s cold start).
- MySQL free pode limitar conexões — o pool do Sequelize já está baixo (`max: 5`).
- Não use a demo com dados reais de pacientes/clientes (LGPD).

---

## Depois do deploy (opcional)

- Custom domain + HTTPS  
- Ligar `N8N_WEBHOOK_*` só quando o n8n estiver público  
- Branch protection / CI já existe em `.github/workflows/ci.yml`
