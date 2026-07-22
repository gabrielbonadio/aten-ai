---
name: aten-ai
description: Overlay de padrões do micro‑SaaS Aten AI (multi-tenant, RBAC, Sequelize, migrações, observabilidade e UX B2B).
---

# Aten AI (overlay do projeto)

Esta skill **complementa** as skills genéricas (security, scalability, frontend-design, etc.) com decisões e padrões **específicos do Aten AI**. Use quando a mudança tocar dados, auth, multi-tenant, rotas, migrações, auditoria, ou UX do portal.

## Princípios inegociáveis (resumo)

- **Isolamento multi-tenant**: `tenantId` **nunca** vem do cliente; vem sempre de `req.user.tenantId`.
- **RBAC por padrão**: rotas destrutivas/sensíveis exigem `ensureRole(['ADMIN'])` após `ensureAuthenticated`.
- **Soft delete**: modelos/migrações novos suportam `deletedAt` + `paranoid: true` (exceção rara e justificada).
- **Logs sem PII**: não logar dados sensíveis; preferir IDs e correlação.

## Backend (Node/Express/Sequelize)

### Multi-tenant: padrão de consulta

- Toda query que lê/escreve dados de negócio deve ser **escopada por tenant**:
  - `findAll/findOne`: `where: { tenantId, ... }` (use `[Op.and]` quando necessário)
  - `update/destroy`: garantir posse com `where: { id, tenantId }` ou `findOne({ where: { id, tenantId } })` antes
  - `create/bulkCreate`: injetar `tenantId` no service (derivado do contexto autenticado)

### Rotas e RBAC

- Ordem obrigatória: `ensureAuthenticated` → `ensureRole(...)` → handler.
- **DELETE** e **PUT/PATCH** “sensíveis” (configurações, permissões, billing, dados críticos) exigem `ADMIN`, salvo regra explícita do produto.

### Soft delete e auditoria

- Novas tabelas/modelos: incluir `deletedAt` e configurar `paranoid: true`.
- Exclusão física (`force: true` / `paranoid: false`) só quando inevitável e com justificativa.

### Migrações seguras

- Para campos novos em tabelas existentes: preferir estratégia em etapas (adicionar nullable → backfill → restringir), evitando locks prolongados.
- Índices: criar índices necessários para filtros frequentes (`tenantId`, chaves de busca), principalmente em tabelas “listas”.

### Erros e respostas API

- Erros devem ser **acionáveis** e consistentes (status code correto), sem vazar detalhes internos/PII.
- Em falhas inesperadas: retornar mensagem genérica ao cliente e registrar contexto com IDs (tenantId, userId, requestId).

## Frontend (Angular Portal)

- Formulários: estados de loading/disabled consistentes; validação clara; mensagens curtas e acionáveis.
- Acessibilidade mínima: labels, foco, contraste; evitar depender só de cor.
- UX B2B (SMB): priorizar clareza, previsibilidade e feedback imediato em ações de impacto.

## Checklist rápido antes de terminar

- Mudança toca dados? tem `tenantId` garantido do contexto e filtros `where` corretos?
- Mudança toca permissão? rotas sensíveis têm `ensureRole(['ADMIN'])`?
- Mudança adiciona tabela/campo? `deletedAt` e migração segura aplicados quando cabível?
- Logs/erros expõem algo sensível? remover/mascarar.

