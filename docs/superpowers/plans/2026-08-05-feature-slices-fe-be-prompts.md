# Plano de implementação por fatias — valor da clínica (FE + BE)

> **Como usar:** rode **uma fatia por vez**. Em cada fatia: **primeiro o backend** (subagent BE), depois o **frontend** (subagent FE), usando os prompts abaixo (copiar/colar).  
> Fatia destacada para começar: **S0 (status + COMPLETED)**.

**Repo:** `c:\work\aten-ai`  
**Regras obrigatórias:** `.agent-skills/aten-ai/SKILL.md`, `.cursor/rules/multi-tenant-security.mdc`, `backend/.cursor/rules/rbac-security.mdc`  
**Não fazer nesta fase:** Supabase, Electron, estoque, NF-e, billing Stripe do SaaS.

---

## Ordem de execução (importância × dificuldade)

| Ordem | Fatia | Importância | Dificuldade | Depende de |
|------:|-------|-------------|-------------|------------|
| **1º** | **S0** — Status na agenda + COMPLETED no prontuário | P0 (desbloqueia D+3) | Baixa | — |
| **2º** | **S1** — Badge `confirmationStatus` na agenda | P1 | Baixa | S0 (mesmo ecrã) |
| **3º** | **S2** — Convite / gestão de staff | P0 (clínica com equipe) | Média | — |
| **4º** | **S3** — RBAC recepção vs vet na UI + rotas | P0 | Baixa–média | S2 |
| **5º** | **S4** — Profissional na agenda | P1 | Média | S2 |
| **6º** | **S5** — Vacina: próxima dose + lembrete WhatsApp | P1 diferencial | Alta | S0 |
| **7º** | **S6** — Reagendar via WhatsApp | P2 | Alta | S0 + n8n |
| **8º** | **S7** — Caixa mínimo (valor + pago) | P2 | Média | S0 |

Regra: **BE → FE** dentro da fatia. Não abrir S2 FE antes do BE de S2 estar mergeável.

---

## Bloco comum (colar no início de TODOS os prompts)

```text
Contexto Aten AI (monorepo c:\work-aten-ai → c:\work\aten-ai):
- Backend: Node/Express/Sequelize/MySQL, multi-tenant por tenantId do JWT (nunca do body).
- Frontend: Angular 17 standalone, services em frontend/src/app/core/services/, features em frontend/src/app/features/.
- Soft delete paranoid; logs sem PII; seguir .agent-skills/aten-ai/SKILL.md.
- Escopo: SÓ esta fatia. Não refatorar irrelevantemente. Não migrar DB/dialeto.
- Ao terminar: listar ficheiros alterados, como testar manualmente, e se ficou algo bloqueado.
```

(Corrigir path se o workspace for diferente: `c:\work\aten-ai`.)

---

# Fatia S0 — Status da consulta + COMPLETED no prontuário (COMEÇAR AQUI)

**Importância:** P0 · **Dificuldade:** Baixa · **Valor:** agenda reflete o dia; follow-up D+3 passa a disparar.

### Critérios de aceite

- [ ] Portal altera status via `PATCH /appointments/:id/status` (`SCHEDULED` | `COMPLETED` | `CANCELED`)
- [ ] UI na agenda (e idealmente dashboard do dia) com ações claras + feedback toast
- [ ] Criar prontuário com `appointmentId` marca esse appointment como `COMPLETED` (configurável ou sempre — preferir **sempre** se houver appointmentId)
- [ ] Testes BE para `updateStatus` / side-effect no medical record; FE: método no service + UI utilizável
- [ ] Modelo FE alinhado: status API em inglês (`SCHEDULED`…), labels PT só na UI

### Prompt — Subagent BACKEND (S0)

```text
[Bloco comum Aten AI]

Tu és o subagent BACKEND. Fatia S0 apenas.

Objetivo:
1) Garantir que PATCH /appointments/:id/status está sólido (tenant scoped), documentado, com testes.
   Rotas: backend/src/modules/appointments/routes.ts (já existe updateStatus).
   Service: AppointmentService.updateStatus.
2) Ao criar MedicalRecord COM appointmentId, após create bem-sucedido, marcar o appointment do mesmo tenantId como status COMPLETED (idempotente se já COMPLETED).
   Ficheiros: MedicalRecordService, possivelmente AppointmentRepository/Service.
3) Não quebrar jobs de follow-up (já filtram status=COMPLETED).
4) Se faltar status NO_SHOW no enum: NÃO adicionar nesta fatia — usar CANCELED para cancelamento; COMPLETED para atendido. (NO_SHOW fica para depois se produto pedir.)

Critérios:
- tenantId só de req.user / parâmetro de service
- Testes Jest cobrindo: updateStatus happy path + appointment de outro tenant 404; create record completa appointment
- Migration só se precisares de índice/campo (provavelmente NÃO)

Não tocar no frontend.
Entregar: resumo + comandos de teste (ex. npm test no backend filtrando appointments/medical-records).
```

### Prompt — Subagent FRONTEND (S0) — rodar DEPOIS do BE

```text
[Bloco comum Aten AI]

Tu és o subagent FRONTEND. Fatia S0 apenas. Assumir API:
- PATCH {apiUrl}/appointments/:id/status body: { status: 'SCHEDULED'|'COMPLETED'|'CANCELED' }
- POST medical-records com appointmentId já existente; back marca COMPLETED

Objetivo:
1) appointment.model.ts: alinhar AppointmentStatusCode; mapear labels PT na UI (não persistir PT na API).
2) AppointmentService: método updateStatus(id, status).
3) agenda.component (+ modal se fizer sentido): ações "Marcar concluída" / "Cancelar" (e reabrir para SCHEDULED se útil) com loading/disabled e toast via NotificationService.
4) dashboard do dia: se listar agendamentos, permitir a mesma ação rápida OU link para agenda — não duplicar lógica pesada; preferir partilhar helper/método do service.
5) pet-consult-modal / fluxo de prontuário: se já envia appointmentId, confirmar UX (mensagem "consulta marcada como concluída"); se não envia, passar appointmentId quando a consulta veio da agenda.

Seguir padrões Angular standalone do projeto. Não inventar design system novo.
Não tocar no backend.
Entregar: como testar no browser (passos).
```

---

# Fatia S1 — Badge de confirmação WhatsApp

**Importância:** P1 · **Dificuldade:** Baixa · **Depende:** S0 (mesmo ecrã da agenda)

### Critérios de aceite

- [ ] Lista/agenda mostra `PENDING` | `CONFIRMED` (e cancel via status)
- [ ] Só leitura nesta fatia (sem editar confirmationStatus no portal)

### Prompt — BACKEND (S1)

```text
[Bloco comum Aten AI]
Subagent BACKEND. Fatia S1.

Garantir que GET /appointments (e detalhe se houver) serializa confirmationStatus no JSON.
Se já serializa via Sequelize toJSON, só adicionar/ajustar testes de contrato e OpenAPI na routes.
Sem migration se a coluna já existe (appointments.confirmationStatus).
Não tocar frontend. Escopo mínimo.
```

### Prompt — FRONTEND (S1)

```text
[Bloco comum Aten AI]
Subagent FRONTEND. Fatia S1. Rodar após BE S1 (ou se confirmationStatus já vem na API).

1) Estender Appointment model com confirmationStatus?: 'PENDING'|'CONFIRMED'|'RESCHEDULED'|null
2) Na agenda, badge discreto: Pendente / Confirmado (WhatsApp). Não usar cards novos desnecessários; seguir visual existente.
3) Não permitir editar confirmationStatus no portal nesta fatia.
Não tocar backend.
```

---

# Fatia S2 — Convite e gestão de staff

**Importância:** P0 · **Dificuldade:** Média · **Valor:** clínica com funcionários

### Critérios de aceite

- [ ] ADMIN convida MEMBER (e-mail) → link/token → define senha → entra no mesmo tenant
- [ ] ADMIN lista users do tenant; pode desativar (não apagar hard sem necessidade)
- [ ] Signup público continua criando só o 1º ADMIN; invite não cria tenant novo
- [ ] Reutilizar padrão UserToken (novo purpose `invite` ou similar) + Resend como reset

### Prompt — BACKEND (S2)

```text
[Bloco comum Aten AI]
Subagent BACKEND. Fatia S2 — team invite.

Implementar:
1) Migration: se necessário purpose ENUM em user_tokens (+ 'invite'); users já tem role ADMIN|MEMBER.
2) ADMIN-only routes (ensureAuthenticated → ensureRole(['ADMIN'])):
   - POST /users/invites { email, role?: 'MEMBER'|'ADMIN' } — cria user inactive ou pending + token invite; envia e-mail (Resend, espelhar AuthService forgot password)
   - GET /users — lista users do tenant (sem password_hash)
   - PATCH /users/:id { role?, active?/disabled? } — não permitir auto-remoção do último ADMIN
3) POST /auth/accept-invite { token, name, password } — define senha, invalida token, permite login
4) tenantId SEMPRE do ADMIN autenticado no invite; no accept-invite do token ligado ao user.tenantId
5) Testes: invite happy path; MEMBER não convida; token inválido; não convidar e-mail já existente no tenant

Seguir soft delete/paranoid se users tiver deletedAt; senão flag isActive.
Documentar endpoints OpenAPI breve.
Não implementar UI.
```

### Prompt — FRONTEND (S2)

```text
[Bloco comum Aten AI]
Subagent FRONTEND. Fatia S2 — team UI. Assumir endpoints do BE S2 (ajustar paths se o BE documentar outros iguais em espírito).

1) Nova área Settings ou rota /team: lista de membros; formulário convidar (email + role).
2) Só ADMIN vê gestão de equipe (esconder para MEMBER; usar role de AuthService/user_data).
3) Página guest /accept-invite (token query) espelhando reset-password: nome + senha forte (password-policy.util).
4) Services + models tipados; estados loading/erro acionáveis.
5) Nav: entrada "Equipe" só ADMIN ou secção dentro de Settings.

Não alterar BE. Não implementar permissões finas além de esconder UI (S3 fecha RBAC).
```

---

# Fatia S3 — RBAC produto (recepção vs vet)

**Importância:** P0 · **Dificuldade:** Baixa–média · **Depende:** S2

### Critérios de aceite

- [ ] Matriz escrita no PR/docs curto
- [ ] DELETE sensíveis e settings PUT = ADMIN
- [ ] MEMBER: agenda CRUD básico, tutores/pets create, prontuário create; sem invite/settings destructivos
- [ ] FE esconde botões proibidos; BE rejeita 403 (fonte da verdade)

### Prompt — BACKEND (S3)

```text
[Bloco comum Aten AI]
Subagent BACKEND. Fatia S3 — RBAC.

1) Auditar rotas em modules/*/routes.ts e aplicar ensureRole(['ADMIN']) onde falta (DELETE pets/records, PUT settings, invites, etc.).
2) Garantir MEMBER autenticado ainda acede GET/POST necessários à operação diária (agenda, tutores, pets, medical-records create).
3) Testes de integração/rota: MEMBER recebe 403 nos casos sensíveis; 200/201 nos permitidos.
4) Adicionar docs/rbac-matrix.md com tabela recurso × ADMIN × MEMBER.

Não fazer UI além do necessário. Sem novos roles (só ADMIN|MEMBER).
```

### Prompt — FRONTEND (S3)

```text
[Bloco comum Aten AI]
Subagent FRONTEND. Fatia S3 — RBAC UI.

1) Helper/isAdmin no AuthService (role do user em memória/localStorage).
2) Esconder: delete pets/prontuários, editar settings clínica, gestão equipe, TOTP se só admin — conforme matriz BE.
3) Tratamento 403: toast genérico acionável ("Sem permissão").
4) Testes unitários leves do helper de role se o projeto já testa assim.

Não alterar regras no BE; alinhar à matriz docs/rbac-matrix.md.
```

---

# Fatia S4 — Profissional na agenda

**Importância:** P1 · **Dificuldade:** Média · **Depende:** S2 (users listáveis)

### Critérios de aceite

- [ ] Appointment tem assignedUserId (ou veterinarianId) opcional
- [ ] Filtro "Minha agenda" / por profissional
- [ ] Default ao criar: user logado

### Prompt — BACKEND (S4)

```text
[Bloco comum Aten AI]
Subagent BACKEND. Fatia S4.

1) Migration nullable assignedUserId FK users.id + índice (tenantId, assignedUserId, date) se fizer sentido.
2) Create/update/list support; validar user pertence ao mesmo tenantId.
3) Query filter assignedUserId=me|uuid.
4) Testes tenant isolation.

Não UI.
```

### Prompt — FRONTEND (S4)

```text
[Bloco comum Aten AI]
Subagent FRONTEND. Fatia S4.

1) Modal criar/editar agenda: select de profissionais (GET /users — ADMIN ou endpoint seguro listagem nomes).
2) Filtro na agenda: Todos | Eu | profissional X.
3) Mostrar nome do profissional na linha do agendamento.
Seguir padrões existentes do agenda.component.
```

---

# Fatia S5 — Vacina: próxima dose + lembrete

**Importância:** P1 (diferencial) · **Dificuldade:** Alta · **Depende:** S0 patterns de job

### Critérios de aceite (MVP enxuto — NÃO protocolo V10 completo)

- [ ] No pet: registar vacina aplicada + data da **próxima dose**
- [ ] Job diário: D-1 da próxima dose → webhook n8n (espelhar reminder claim-first)
- [ ] UI no perfil do pet

### Prompt — BACKEND (S5)

```text
[Bloco comum Aten AI]
Subagent BACKEND. Fatia S5 — vaccine reminders MVP.

1) Tabela pet_vaccinations (ou vaccine_due): petId, tenantId, name/label, appliedAt, nextDueAt, reminderSentAt, deletedAt paranoid.
2) CRUD mínimo escopado tenant; índices nextDueAt + reminderSentAt.
3) Job similar AppointmentRemindersJob: claim-first reminderSentAt, payload n8n vaccine.reminder.
4) Documentar payload em docs/n8n-webhooks.md.
5) Testes job + tenant.

Não implementar NLP. Não frontend.
```

### Prompt — FRONTEND (S5)

```text
[Bloco comum Aten AI]
Subagent FRONTEND. Fatia S5.

1) Em pet-profile: secção Vacinas — listar, adicionar (nome, aplicada em, próxima dose).
2) Service + model; empty state claro.
3) Sem calendário complexo; lista + datas.

Não criar workflows n8n (só consumir API).
```

---

# Fatia S6 — Reagendar via WhatsApp

**Importância:** P2 · **Dificuldade:** Alta · **Depende:** S0 + n8n operacional

### Prompt — BACKEND (S6)

```text
[Bloco comum Aten AI]
Subagent BACKEND. Fatia S6 — reschedule via conversation.

1) ConversationReplyService: além de CONFIRMED/CANCELED, aceitar RESCHEDULE com nova data (ISO) validada; atualizar appointment.date + confirmationStatus RESCHEDULED se existir no enum.
2) Ajustar schema Joi inbound; ConversationState flow; testes.
3) Documentar contrato n8n (intent/action + suggestedDate).
4) Sem UI portal (reagendar manual já existe no PUT appointment).

Cuidado races claim-first; não logar telefone em claro nos logs novos.
```

### Prompt — FRONTEND (S6)

```text
[Bloco comum Aten AI]
Subagent FRONTEND. Fatia S6 (leve).

1) Na agenda, se confirmationStatus=RESCHEDULED, badge "Remarcado" + data atualizada (já vem do GET).
2) Sem UI de simular WhatsApp.
Escopo mínimo visual.
```

---

# Fatia S7 — Caixa mínimo

**Importância:** P2 · **Dificuldade:** Média · **Depende:** S0

### Prompt — BACKEND (S7)

```text
[Bloco comum Aten AI]
Subagent BACKEND. Fatia S7 — payment fields.

1) Migration appointments: amountCents INT NULL, paymentStatus ENUM PENDING|PAID|WAIVED default PENDING.
2) Update via PUT ou PATCH dedicado; list/dashboard metrics: soma PAID do dia (tenant).
3) Testes. Sem gateway de pagamento. Sem NF.
```

### Prompt — FRONTEND (S7)

```text
[Bloco comum Aten AI]
Subagent FRONTEND. Fatia S7.

1) Ao concluir consulta ou no detalhe da agenda: valor (R$) + marcar Pago.
2) Dashboard: card "Recebido hoje" se API fornecer métrica; senão calcular client-side só do dia carregado (documentar limitação).
UX B2B clara; máscara BRL se já houver utils.
```

---

## Como disparar no Cursor (sugestão)

1. **Chat Composer / Agent** novo → colar prompt BE da fatia.  
2. Revisar diff / testes.  
3. Novo chat (ou Task `generalPurpose`) → colar prompt FE da mesma fatia.  
4. Smoke manual checklist da fatia.  
5. Commit só dessa fatia (mensagem focada no valor).  
6. Avançar na tabela de ordem.

### Exemplo Task tool (paralelo só quando não há dependência)

- **Nunca** FE S0 em paralelo com BE S0 se a API ainda não está estável.  
- S1 BE é tão fino que pode ir no mesmo PR que S0 FE se `confirmationStatus` já existir na API.

---

## Checklist rápido S0 (primeira sessão)

```text
[ ] Rodar prompt BACKEND S0
[ ] npm test (appointments + medical-records)
[ ] Rodar prompt FRONTEND S0
[ ] Browser: agenda → Marcar concluída → refrescar lista
[ ] Browser: consulta com prontuário → appointment COMPLETED
[ ] Commit fatia S0
[ ] Seguir para S1 ou S2
```

---

## Relação com o roadmap

Visão produto: `docs/superpowers/plans/2026-08-05-product-roadmap-gaps.md`  
Este ficheiro: **prompts operacionais** para executar por subagents.
