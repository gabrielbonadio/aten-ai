# Production Hardening — Continuação Pós-Security Baseline

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar o caminho do Aten AI até produção segura e operável, nas fases que ficaram fora do baseline de segurança já mergeado em `main` (`6346eba`).

**Architecture:** Manter API Express + Angular SPA + MySQL + n8n. Evoluir sessão para cookies `httpOnly`, endurecer borda (TLS/nginx), observabilidade/CI, e compliance LGPD sem reescrever o domínio. Preferir mudanças incrementais e testáveis; cada fase entrega valor sozinha.

**Tech Stack:** Express 5, Sequelize/MySQL, Angular 17, Docker Compose, GitHub Actions, n8n, (futuro) Redis/BullMQ se filas forem necessárias.

**Baseline já feito (não repetir):** rotas `/tenants` fechadas, rate limit, refresh token + logout, paginação API, fail-fast secrets, MySQL interno no Compose, worker opcional, frontend refresh em 401, senha forte no signup.

---

## File map (próximas fases)

| Área | Arquivos principais |
|------|---------------------|
| Sessão cookie | `backend/src/modules/auth/*`, `backend/src/app.ts`, `frontend/src/app/core/services/auth.service.ts`, `frontend/src/app/core/interceptors/auth.interceptor.ts` |
| UI paginação | `frontend/src/app/features/{pets,tutors,appointments}/*`, services de lista |
| Nginx headers | `frontend/nginx.conf` |
| TLS / deploy | `docker-compose.yml`, `docs/DEPLOY.md` (ou Traefik/Caddy) |
| CI audit | `.github/workflows/ci.yml`, opcional `.github/dependabot.yml` |
| Backups | script + doc em `docs/` |
| LGPD / PII | models + services medical/tutors/tenants; logger |
| 2FA | auth module + settings UI |
| APM | `server.ts` / `app.ts` + env |

---

## Ordem recomendada

1. **Ops imediato** (migration + n8n secret) — bloqueia uso local/prod
2. **Fase A** — HTTPS + headers nginx + backups + CI audit
3. **Fase B** — UI de paginação
4. **Fase C** — Cookies httpOnly (maior mudança de auth)
5. **Fase D** — LGPD / criptografia PII + logs
6. **Fase E** — APM + 2FA (pode paralelizar depois de C)

---

### Task 0: Ops imediato (antes de código novo)

**Files:** nenhum de app — só ambiente

- [ ] **Step 1:** Rodar migration no ambiente local/prod  
  `cd backend && npx sequelize-cli db:migrate`  
  Confirmar coluna `purpose` em `user_tokens`.

- [ ] **Step 2:** Atualizar no n8n o shared secret = `N8N_WEBHOOK_SECRET` dos `.env` (raiz + backend).

- [ ] **Step 3:** Logout/login no portal para emitir access + refresh novos.

- [ ] **Step 4:** Smoke: login → listar pets/tutors/agenda → criar agendamento → webhook reply (se n8n ativo).

---

### Task 1: Headers de segurança no Nginx (frontend)

**Files:**
- Modify: `frontend/nginx.conf`
- Test: abrir portal e DevTools → Response Headers

- [ ] **Step 1:** Adicionar em `server { }`:

```nginx
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https: http://localhost:3000; frame-ancestors 'none'" always;
```

Ajustar `connect-src` à URL real da API em produção.

- [ ] **Step 2:** Rebuild imagem frontend e validar headers.

- [ ] **Step 3:** Commit: `chore(frontend): add security headers to nginx`

---

### Task 2: HTTPS na borda

**Files:**
- Modify: `docs/DEPLOY.md`
- Create (se self-hosted): `docker-compose.override.tls.yml` ou serviço `caddy`/`traefik` em `docker-compose.yml`

- [ ] **Step 1:** Decidir alvo: PaaS (Render/Fly/Vercel+API) **ou** VPS self-hosted.

- [ ] **Step 2a (PaaS):** Documentar domínio custom + HTTPS obrigatório (não opcional) em `docs/DEPLOY.md`.

- [ ] **Step 2b (VPS):** Adicionar Caddy/Traefik com Let's Encrypt, redirect HTTP→HTTPS, HSTS.

- [ ] **Step 3:** Garantir `FRONTEND_URL` e `API_URL` com `https://`.

- [ ] **Step 4:** Commit + smoke HTTPS.

---

### Task 3: Backups MySQL

**Files:**
- Create: `scripts/backup-mysql.sh` (ou `.ps1` para Windows)
- Modify: `docs/DEPLOY.md`

- [ ] **Step 1:** Script `mysqldump` com timestamp + retenção (ex.: 7 dias).

- [ ] **Step 2:** Documentar cron/Task Scheduler e restore (`mysql < dump.sql`).

- [ ] **Step 3:** Testar restore em volume descartável.

- [ ] **Step 4:** Commit: `chore(ops): add MySQL backup script and docs`

---

### Task 4: CI — npm audit + Dependabot

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create: `.github/dependabot.yml`

- [ ] **Step 1:** No job backend e frontend, após `npm ci`:

```yaml
- run: npm audit --audit-level=high
```

Começar sem falhar o build se houver dívida: `continue-on-error: true` na 1ª PR; depois tornar blocking.

- [ ] **Step 2:** Dependabot semanal para `npm` em `/backend` e `/frontend`.

- [ ] **Step 3:** Abrir PR e verificar Actions.

---

### Task 5: UI de paginação

**Files:**
- Modify: `frontend/src/app/core/services/{pet,tutor,appointment}.service.ts`
- Modify: `frontend/src/app/features/pets/pet-list.component.ts`
- Modify: `frontend/src/app/features/tutors/tutors.component.ts`
- Modify: `frontend/src/app/features/appointments/agenda.component.ts`
- Create (opcional): `frontend/src/app/shared/ui/pagination-controls.component.ts`

- [ ] **Step 1:** Services passam a expor `findAllPage(page, pageSize)` retornando `PaginatedResponse<T>` (não só `data`).

- [ ] **Step 2:** Signals `page`, `total`, `totalPages` nos list components.

- [ ] **Step 3:** Controles Anterior/Próxima (ou páginas).

- [ ] **Step 4:** Testes unitários mínimos dos services (unwrap + params).

- [ ] **Step 5:** Commit: `feat(frontend): pagination controls for list views`

---

### Task 6: Sessão em cookie httpOnly

**Files:**
- Modify: `backend/src/modules/auth/controllers/AuthController.ts`
- Modify: `backend/src/modules/auth/services/AuthService.ts`
- Modify: `backend/src/app.ts` (CORS `credentials`)
- Modify: `backend/src/shared/middlewares/ensureAuthenticated.ts`
- Modify: `frontend/src/app/core/services/auth.service.ts`
- Modify: `frontend/src/app/core/interceptors/auth.interceptor.ts`
- Test: auth unit + integration + interceptor specs

**Approach:**  
Login/signup/refresh setam cookies `access_token` + `refresh_token` (`httpOnly`, `Secure` em prod, `SameSite=Lax`). Frontend envia `withCredentials: true` e **para de guardar JWT no localStorage**. Manter Bearer opcional por 1 release (compat) ou cortar de uma vez se só houver o portal Angular.

- [ ] **Step 1:** Backend: `cookie-parser`; set/clear cookies nos endpoints auth.

- [ ] **Step 2:** `ensureAuthenticated` lê cookie **ou** `Authorization`.

- [ ] **Step 3:** Frontend: `HttpClient` com `withCredentials`; remover storage de tokens.

- [ ] **Step 4:** CSRF: para cookie session, validar `Origin`/`Referer` em mutações ou double-submit token.

- [ ] **Step 5:** Testes + commit: `feat(auth): httpOnly cookie session`

---

### Task 7: LGPD — PII e logs

**Files:**
- Modify: logger usage in jobs (`AppointmentRemindersJob`, `AppointmentFollowupsJob`, `N8nWebhookProvider`)
- Create: `backend/src/shared/crypto/fieldEncryption.ts` (AES-256-GCM com chave `PII_ENCRYPTION_KEY`)
- Modify: campos sensíveis (ex.: tutor phone/email, documentos de tenant) — **avaliar escopo real antes de criptografar tudo**

- [ ] **Step 1:** Substituir `console.*` restantes por `logger.*` com e-mail/telefone mascarados.

- [ ] **Step 2:** Definir quais campos são PII críticos; criptografar em repouso só esses.

- [ ] **Step 3:** Documentar retenção de logs e bases legais em `docs/LGPD.md`.

- [ ] **Step 4:** Commit: `feat(security): PII masking and field encryption`

---

### Task 8: Observabilidade (APM / erros)

**Files:**
- Modify: `backend/src/server.ts`, `backend/src/app.ts`, `backend/package.json`
- Modify: frontend `main.ts` (Sentry browser opcional)
- Modify: `.env.example`

- [ ] **Step 1:** Integrar Sentry (ou similar) no backend; capturar 5xx no `errorHandler`.

- [ ] **Step 2:** Expor métricas mínimas dos jobs (found/sent/failed) via log estruturado ou `/metrics`.

- [ ] **Step 3:** Alertas básicos (health 503, error rate).

- [ ] **Step 4:** Commit: `feat(ops): add error tracking and job metrics`

---

### Task 9: 2FA TOTP para ADMIN

**Files:**
- Create: migration `user_totp_*` ou colunas em `users`
- Modify: auth login flow (segundo fator)
- Modify: frontend settings + login UI

- [ ] **Step 1:** Biblioteca `otplib` + QR no setup.

- [ ] **Step 2:** Login: senha OK → exigir código se 2FA ativo.

- [ ] **Step 3:** Recovery codes hashados.

- [ ] **Step 4:** Testes + commit: `feat(auth): TOTP 2FA for ADMIN`

---

## Critérios de “pronto para produção”

- [ ] HTTPS em domínio real; HSTS na borda  
- [ ] Backup testado com restore  
- [ ] CI com audit (pelo menos high)  
- [ ] Sessão não depende só de XSS no `localStorage` (cookies httpOnly) **ou** risco aceito documentado  
- [ ] Paginação UI se volume > 100 registros/clínica  
- [ ] n8n secret alinhado; migration aplicada  
- [ ] Runbook curto em `docs/DEPLOY.md` (env, migrate, backup, rollback)

---

## Fora de escopo deste plano

- Reescrever Angular major (18+)  
- Trocar MySQL por Postgres  
- Filas BullMQ (só se scale horizontal real dos jobs exigir; hoje `ENABLE_IN_PROCESS_JOBS` + worker já mitiga)
