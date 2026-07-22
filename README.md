# Aten AI

SaaS multi-tenant para **clínicas veterinárias**: portal web + API REST + automações via WhatsApp (n8n).

Cada clínica (tenant) gerencia tutores, pets, agendamentos e prontuários com isolamento de dados por JWT. Lembretes, confirmações e follow-ups são despachados para o n8n, que humaniza as mensagens e conversa com o tutor no WhatsApp.

---

## Índice

- [Visão geral](#visão-geral)
- [Stack tecnológica](#stack-tecnológica)
- [Arquitetura](#arquitetura)
- [Estrutura do monorepo](#estrutura-do-monorepo)
- [Pré-requisitos](#pré-requisitos)
- [Rodando com Docker](#rodando-com-docker)
- [Desenvolvimento local](#desenvolvimento-local)
- [Testes](#testes)
- [API e documentação](#api-e-documentação)
- [Segurança multi-tenant](#segurança-multi-tenant)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- Contratos n8n: [`docs/n8n-webhooks.md`](docs/n8n-webhooks.md)

---

## Visão geral

| Módulo | O que faz |
|--------|-----------|
| **Auth** | Signup multi-tenant, login JWT, recuperação de senha |
| **Tutores / Pets** | CRUD com isolamento por `tenantId` |
| **Agendamentos** | Agenda, status, confirmação via WhatsApp |
| **Prontuários** | Sintomas, diagnóstico, prescrição + PDF no browser |
| **Dashboard** | Métricas do dia (pets, tutores, consultas) |
| **Settings** | Branding e dados da clínica |
| **Conversas / n8n** | Webhooks outbound + inbound com shared secret |

---

## Stack tecnológica

### Backend (`/backend`)

| Camada | Tecnologia |
|--------|------------|
| Runtime | Node.js 20 + TypeScript (strict) |
| HTTP | Express 5 |
| ORM | Sequelize 6 + MySQL 8 |
| Auth | JWT (`jsonwebtoken`) + bcryptjs |
| Validação | Joi |
| Docs | Swagger / OpenAPI 3 (`/api-docs`) |
| E-mail | Resend |
| Automação | Webhooks → n8n (WhatsApp) |
| Testes | Jest + Supertest |

### Frontend (`/frontend`)

| Camada | Tecnologia |
|--------|------------|
| Framework | Angular 17 (standalone components) |
| Estilo | Tailwind CSS 3 |
| Ícones | Lucide |
| PDF | jsPDF |
| Auth UI | Reactive Forms + Guard + HTTP Interceptor |

### Infra

- Docker multi-stage (API Node + portal Nginx)
- Docker Compose (MySQL + Backend + Frontend)
- Migrations Sequelize versionadas

---

## Arquitetura

```
┌─────────────┐     JWT      ┌──────────────────┐     SQL      ┌─────────┐
│  Angular    │─────────────▶│  Express API     │─────────────▶│ MySQL 8 │
│  (Nginx)    │◀─────────────│  (multi-tenant)  │◀─────────────│         │
└─────────────┘              └────────┬─────────┘              └─────────┘
                                      │
                         webhooks     │  Authorization: Bearer <secret>
                         (outbound)   ▼
                               ┌────────────┐
                               │    n8n     │──▶ WhatsApp
                               └─────┬──────┘
                                     │ POST /api/v1/conversations/reply
                                     │ (inbound, shared secret)
                                     ▼
                               ┌────────────┐
                               │  Express   │
                               └────────────┘
```

**Backend — camadas por módulo**

```
routes → controller → service → repository / model
```

**Frontend — organização**

```
core/        # services, guards, interceptors, models
features/    # domínio (pets, agenda, tutors, settings)
pages/       # dashboard, login
shared/      # UI compartilhada
```

Jobs in-process (lembretes D-1, follow-up, GC de conversas) usam **claim-first** e idempotência para evitar WhatsApps duplicados.

---

## Estrutura do monorepo

```
aten-ai/
├── backend/                 # API Node.js + Express + Sequelize
│   ├── src/modules/         # auth, pets, tutors, appointments, ...
│   ├── src/__tests__/       # unit + integration (Jest)
│   ├── migrations/          # Sequelize CLI
│   ├── Dockerfile
│   └── .env.example
├── frontend/                # Portal Angular 17
│   ├── src/app/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── .env.example
├── docker-compose.yml
├── .env.example             # variáveis do Compose
└── README.md
```

---

## Pré-requisitos

| Ferramenta | Versão sugerida |
|------------|-----------------|
| Node.js | 20 LTS |
| npm | 10+ |
| Docker + Docker Compose | 24+ / Compose v2 |
| MySQL | 8.x (apenas se rodar sem Docker) |
| n8n | opcional (automações WhatsApp) |

---

## Rodando com Docker

A forma mais rápida de subir o stack completo (MySQL + API + portal).

### 1. Configure o ambiente

```bash
cp .env.example .env
```

Edite pelo menos `JWT_SECRET` (mínimo 16 caracteres). As demais variáveis têm defaults seguros para desenvolvimento.

### 2. Build e start

```bash
docker compose up --build
```

Na primeira subida o backend executa as **migrations** automaticamente via entrypoint.

### 3. Acesse

| Serviço | URL |
|---------|-----|
| Portal | http://localhost:8080 |
| API | http://localhost:3000 |
| Health | http://localhost:3000/health |
| Swagger | http://localhost:3000/api-docs |
| MySQL | `localhost:3306` |

### 4. Parar

```bash
docker compose down
# Mantém o volume do MySQL. Para apagar dados:
# docker compose down -v
```

> **Nota:** `API_URL` no `.env` da raiz deve ser a URL **vista pelo navegador** (`http://localhost:3000`), não o hostname interno do container (`backend`).

---

## Desenvolvimento local

Use quando for alterar código com hot-reload (`ts-node-dev` / `ng serve`).

### Banco de dados

Opção A — só o MySQL via Compose:

```bash
docker compose up mysql -d
```

Opção B — MySQL local na porta `3306`.

### Backend

```bash
cd backend
cp .env.example .env
# Ajuste DB_* (DB_HOST=localhost) e JWT_SECRET

npm install
npm run migrate
npm run dev
```

API em http://localhost:3000.

### Frontend

```bash
cd frontend
cp .env.example .env   # opcional — define API_URL
npm install
npm start              # sync:env + ng serve
```

Portal em http://localhost:4200.

Para apontar a API sem `.env`, edite `src/environments/environment.ts` (`apiUrl`).

### Fluxo mínimo de uso

1. `POST /auth/signup` (ou via UI, se disponível) — cria tenant + admin  
2. Login em `/login`  
3. Cadastre tutor → pet → agendamento  

---

## Testes

Os testes do backend **não dependem** de MySQL nem de n8n/Resend. Sequelize e serviços externos são mockados.

```bash
cd backend
npm test                 # suíte completa
npm run test:watch       # modo watch
npm run test:coverage    # cobertura
```

Cobertura atual (crítica):

- Login (válido / senha errada / usuário inexistente)
- Isolamento multi-tenant (pets entre tenants)
- Criação de agendamento + disparo de webhook

---

## API e documentação

Com a API no ar:

- **Swagger UI:** http://localhost:3000/api-docs  
- **Health check:** `GET /health`

Rotas principais (autenticadas com `Authorization: Bearer <jwt>`):

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/signup` | Cria tenant + admin |
| POST | `/auth/login` | Login |
| GET | `/auth/me` | Usuário autenticado |
| CRUD | `/tutors`, `/pets`, `/appointments` | Domínio clínico |
| CRUD | `/medical-records` | Prontuários |
| GET | `/dashboard/metrics` | Métricas |
| GET/PUT | `/settings` | Configuração da clínica |
| POST | `/api/v1/conversations/reply` | Inbound n8n (shared secret) |

O endpoint de conversas exige:

```http
Authorization: Bearer <N8N_WEBHOOK_SECRET>
```

Contratos completos de payload (outbound + inbound): [`docs/n8n-webhooks.md`](docs/n8n-webhooks.md).  
Texto de pitch para portfólio/entrevista: [`docs/PORTFOLIO-PITCH.md`](docs/PORTFOLIO-PITCH.md).

---

## Segurança multi-tenant

- `tenantId` vem **somente** do JWT (`req.user`), nunca do body do cliente nas rotas autenticadas.
- Queries filtram por `tenantId` (ex.: `{ id, tenantId }`).
- Webhook inbound do n8n usa **shared secret** (`N8N_WEBHOOK_SECRET`), comparado com `crypto.timingSafeEqual`.
- Guard Angular valida presença **e expiração** do JWT no client; a assinatura é sempre verificada no backend.

---

## Variáveis de ambiente

| Arquivo | Uso |
|---------|-----|
| `.env.example` (raiz) | Docker Compose |
| `backend/.env.example` | API em desenvolvimento / produção |
| `frontend/.env.example` | `API_URL` para sync/build |

Nunca versionar `.env` reais. O `.gitignore` já protege `.env` e permite apenas `!.env.example`.

---

## Scripts úteis

```bash
# Backend
npm run dev          # API com hot-reload
npm run build        # tsc → dist/
npm run migrate      # Sequelize migrations
npm test             # Jest

# Frontend
npm start            # ng serve (porta 4200)
npm run build        # build de produção
npm run sync:env     # gera environment.ts a partir do .env

# Raiz
docker compose up --build
docker compose logs -f backend
```

---

## Licença

Projeto privado / educacional — ajuste a licença conforme a necessidade do time.
