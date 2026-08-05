# COPY-PASTE — Prompts FE/BE (ordem de execução)

**Como usar**
1. Abre um **chat Agent novo**.
2. Copia **só o próximo** bloco da lista (não coloques dois de uma vez).
3. Ordem: `01 BE` → `02 FE` → `03 BE` → … até `16 FE`.
4. Entre BE e FE da mesma fatia: deixa o BE terminar e (ideal) faz smoke/testes.
5. Workspace: `c:\work\aten-ai`

Não peças “faz o documento todo” — cola **um** prompt por chat.

---

## 01 — BACKEND S0 (status + COMPLETED)

```
Contexto Aten AI — workspace c:\work\aten-ai
- Backend: Node/Express/Sequelize/MySQL, multi-tenant: tenantId sempre de req.user / JWT, NUNCA do body.
- Soft delete paranoid; logs sem PII; seguir .agent-skills/aten-ai/SKILL.md e backend/.cursor/rules/rbac-security.mdc
- Escopo: SÓ fatia S0 BACKEND. Não tocar frontend. Não migrar dialeto. Não fazer S1+.
- Ao terminar: listar ficheiros alterados, comandos de teste, o que ficou bloqueado. PARAR.

Tu és o subagent BACKEND. Fatia S0.

Objetivo:
1) Garantir que PATCH /appointments/:id/status está sólido (tenant scoped), documentado, com testes.
   Rotas: backend/src/modules/appointments/routes.ts (já existe updateStatus).
   Service: AppointmentService.updateStatus. Status: SCHEDULED | COMPLETED | CANCELED.
2) Ao criar MedicalRecord COM appointmentId, após create bem-sucedido, marcar o appointment do mesmo tenantId como COMPLETED (idempotente se já COMPLETED).
   Ficheiros: MedicalRecordService e/ou AppointmentRepository/Service.
3) Não quebrar jobs de follow-up (filtram status=COMPLETED).
4) NÃO adicionar status NO_SHOW nesta fatia.

Critérios:
- Testes Jest: updateStatus happy path; appointment de outro tenant → 404; create medical record completa o appointment.
- Migration só se realmente precisares (provavelmente não).

Entregar resumo + como correr os testes (ex. npm test no backend).
```

---

## 02 — FRONTEND S0 (depois do 01)

```
Contexto Aten AI — workspace c:\work\aten-ai
- Frontend: Angular 17 standalone; services em frontend/src/app/core/services/; features em frontend/src/app/features/
- Seguir .agent-skills/aten-ai/SKILL.md (UX B2B). Escopo: SÓ fatia S0 FRONTEND. Não tocar backend. Não fazer S1+.
- Ao terminar: passos de teste no browser. PARAR.

Tu és o subagent FRONTEND. Fatia S0.
Assumir API já pronta:
- PATCH {apiUrl}/appointments/:id/status body: { status: 'SCHEDULED'|'COMPLETED'|'CANCELED' }
- POST medical-records com appointmentId → back marca appointment COMPLETED

Objetivo:
1) appointment.model.ts: alinhar AppointmentStatusCode; labels em PT só na UI (API em inglês).
2) AppointmentService: método updateStatus(id, status).
3) agenda.component: ações "Marcar concluída" / "Cancelar" (e reabrir SCHEDULED se útil) com loading/disabled + toast (NotificationService).
4) dashboard do dia: ação rápida OU link para agenda — não duplicar lógica pesada.
5) pet-consult-modal / prontuário: enviar appointmentId quando a consulta veio da agenda; feedback "consulta marcada como concluída".

Seguir padrões do projeto. Não inventar design system novo.
```

---

## 03 — BACKEND S1 (badge confirmação API)

```
Contexto Aten AI — workspace c:\work\aten-ai
- Backend Node/Express/Sequelize; tenantId do JWT; .agent-skills/aten-ai/SKILL.md
- Escopo: SÓ fatia S1 BACKEND. Não tocar frontend. Não fazer S2+.
- Ao terminar: resumo + testes. PARAR.

Tu és o subagent BACKEND. Fatia S1.

Garantir que GET /appointments (e detalhe se houver) serializa confirmationStatus no JSON.
Se já serializa via Sequelize, só adicionar/ajustar testes de contrato e OpenAPI nas routes.
Sem migration se a coluna appointments.confirmationStatus já existe.
Escopo mínimo.
```

---

## 04 — FRONTEND S1 (depois do 03)

```
Contexto Aten AI — workspace c:\work\aten-ai
- Frontend Angular 17 standalone; .agent-skills/aten-ai/SKILL.md
- Escopo: SÓ fatia S1 FRONTEND. Não tocar backend. Não fazer S2+.
- Ao terminar: passos de teste no browser. PARAR.

Tu és o subagent FRONTEND. Fatia S1.
Assumir que confirmationStatus já vem no GET /appointments.

1) Estender Appointment model: confirmationStatus?: 'PENDING'|'CONFIRMED'|'RESCHEDULED'|null
2) Na agenda: badge discreto Pendente / Confirmado (WhatsApp). Seguir visual existente; sem cards desnecessários.
3) Não permitir editar confirmationStatus no portal nesta fatia.
```

---

## 05 — BACKEND S2 (convite staff)

```
Contexto Aten AI — workspace c:\work\aten-ai
- Backend Node/Express/Sequelize/MySQL; tenantId do JWT; soft delete; logs sem PII
- Seguir .agent-skills/aten-ai/SKILL.md e rbac-security (ensureAuthenticated → ensureRole)
- Escopo: SÓ fatia S2 BACKEND. Não tocar frontend. Não fazer S3+.
- Ao terminar: resumo, endpoints, testes. PARAR.

Tu és o subagent BACKEND. Fatia S2 — team invite.

Implementar:
1) Migration se necessário: purpose ENUM em user_tokens (+ 'invite'). Users já tem role ADMIN|MEMBER.
2) Rotas ADMIN-only:
   - POST /users/invites { email, role?: 'MEMBER'|'ADMIN' } — cria user pending/inactive + token invite; e-mail via Resend (espelhar forgot password em AuthService)
   - GET /users — lista users do tenant (sem password_hash)
   - PATCH /users/:id { role?, active/disabled } — impedir remover/desativar o último ADMIN
3) POST /auth/accept-invite { token, name, password } — define senha, invalida token, permite login
4) No invite, tenantId = ADMIN autenticado. No accept-invite, tenant vem do user ligado ao token.
5) Testes: happy path; MEMBER não convida (403); token inválido; e-mail já existente no tenant.

Signup público continua a criar só o 1º ADMIN da clínica. Invite NÃO cria tenant novo.
OpenAPI breve. Sem UI.
```

---

## 06 — FRONTEND S2 (depois do 05)

```
Contexto Aten AI — workspace c:\work\aten-ai
- Frontend Angular 17 standalone; services/features existentes; .agent-skills/aten-ai/SKILL.md
- Escopo: SÓ fatia S2 FRONTEND. Não tocar backend (usar endpoints que o BE S2 documentou).
- Ao terminar: passos de teste no browser. PARAR.

Tu és o subagent FRONTEND. Fatia S2 — team UI.

1) Área Settings ou rota /team: lista membros + formulário convidar (email + role).
2) Só ADMIN vê gestão de equipe (role em AuthService / user_data).
3) Página guest /accept-invite?token=... espelhando reset-password: nome + senha (password-policy.util).
4) Services + models tipados; loading/erro acionáveis.
5) Nav "Equipe" só ADMIN OU secção dentro de Settings.

Não implementar matriz RBAC completa (isso é S3) — só esconder gestão de equipe para MEMBER.
```

---

## 07 — BACKEND S3 (RBAC rotas)

```
Contexto Aten AI — workspace c:\work\aten-ai
- Backend; ensureAuthenticated → ensureRole; .agent-skills/aten-ai/SKILL.md; rbac-security.mdc
- Escopo: SÓ fatia S3 BACKEND. Não tocar frontend. Depende de S2 feito.
- Ao terminar: docs/rbac-matrix.md + testes. PARAR.

Tu és o subagent BACKEND. Fatia S3 — RBAC.

1) Auditar modules/*/routes.ts e aplicar ensureRole(['ADMIN']) onde falta (DELETE pets/records, PUT settings, invites, etc.).
2) MEMBER autenticado deve continuar com GET/POST da operação diária (agenda, tutores, pets, medical-records create).
3) Testes: MEMBER → 403 nos sensíveis; 200/201 nos permitidos.
4) Criar docs/rbac-matrix.md (tabela recurso × ADMIN × MEMBER).

Sem novos roles além de ADMIN|MEMBER. Sem UI.
```

---

## 08 — FRONTEND S3 (depois do 07)

```
Contexto Aten AI — workspace c:\work\aten-ai
- Frontend Angular 17; .agent-skills/aten-ai/SKILL.md
- Escopo: SÓ fatia S3 FRONTEND. Não tocar backend. Alinhar a docs/rbac-matrix.md
- Ao terminar: passos de teste (login ADMIN vs MEMBER). PARAR.

Tu és o subagent FRONTEND. Fatia S3 — RBAC UI.

1) Helper isAdmin (ou similar) no AuthService a partir do role do user.
2) Esconder conforme matriz: delete pets/prontuários, editar settings clínica, gestão equipe, TOTP se só admin, etc.
3) Em 403 da API: toast "Sem permissão" (acionável, curto).
4) Testes unitários leves do helper se o projeto já tiver padrão de testes para isso.
```

---

## 09 — BACKEND S4 (profissional na agenda)

```
Contexto Aten AI — workspace c:\work\aten-ai
- Backend Sequelize/MySQL; tenantId JWT; migrations seguras; .agent-skills/aten-ai/SKILL.md
- Escopo: SÓ fatia S4 BACKEND. Não tocar frontend. Depende de users listáveis (S2).
- Ao terminar: migration + testes. PARAR.

Tu és o subagent BACKEND. Fatia S4.

1) Migration: appointments.assignedUserId UUID/FK users.id NULL + índice útil (ex. tenantId, assignedUserId, date).
2) Create/update/list suportam assignedUserId; validar que o user pertence ao mesmo tenantId.
3) Query filter: assignedUserId=<uuid> ou assignedUserId=me (user autenticado).
4) Testes de isolamento multi-tenant.

Sem UI.
```

---

## 10 — FRONTEND S4 (depois do 09)

```
Contexto Aten AI — workspace c:\work\aten-ai
- Frontend Angular 17; agenda.component existente; .agent-skills/aten-ai/SKILL.md
- Escopo: SÓ fatia S4 FRONTEND. Não tocar backend.
- Ao terminar: passos de teste no browser. PARAR.

Tu és o subagent FRONTEND. Fatia S4.

1) Modal criar/editar agenda: select de profissionais (GET /users ou endpoint que o BE expôs para listar nomes).
2) Filtro na agenda: Todos | Eu | profissional X.
3) Mostrar nome do profissional na linha do agendamento.
Default ao criar: utilizador logado, se fizer sentido.
Seguir padrões visuais existentes.
```

---

## 11 — BACKEND S5 (vacinas + lembrete)

```
Contexto Aten AI — workspace c:\work\aten-ai
- Backend; jobs como AppointmentRemindersJob (claim-first); n8n webhooks; .agent-skills/aten-ai/SKILL.md
- Escopo: SÓ fatia S5 BACKEND. Não tocar frontend. MVP: data próxima dose + lembrete (NÃO protocolo V10 completo).
- Ao terminar: migration, job, docs/n8n-webhooks.md, testes. PARAR.

Tu és o subagent BACKEND. Fatia S5 — vaccine reminders MVP.

1) Tabela pet_vaccinations (ou vaccine_due): petId, tenantId, name/label, appliedAt, nextDueAt, reminderSentAt, deletedAt (paranoid).
2) CRUD mínimo escopado por tenant; índices nextDueAt + reminderSentAt.
3) Job diário: D-1 de nextDueAt, claim-first em reminderSentAt, payload n8n vaccine.reminder (espelhar padrão de reminders).
4) Documentar payload em docs/n8n-webhooks.md.
5) Testes job + tenant isolation.

Sem NLP. Sem UI.
```

---

## 12 — FRONTEND S5 (depois do 11)

```
Contexto Aten AI — workspace c:\work\aten-ai
- Frontend Angular 17; pet-profile.component; .agent-skills/aten-ai/SKILL.md
- Escopo: SÓ fatia S5 FRONTEND. Não tocar backend. Não criar workflows n8n.
- Ao terminar: passos de teste no browser. PARAR.

Tu és o subagent FRONTEND. Fatia S5.

1) Em pet-profile: secção Vacinas — listar e adicionar (nome, aplicada em, próxima dose).
2) Service + model tipados; empty state claro.
3) Lista + datas; sem calendário complexo.
```

---

## 13 — BACKEND S6 (reagendar WhatsApp)

```
Contexto Aten AI — workspace c:\work\aten-ai
- Backend; ConversationReplyService; ConversationState; Joi schemas; logs sem PII (não logar telefone)
- Escopo: SÓ fatia S6 BACKEND. Não tocar frontend portal além do necessário. Depende de n8n em produção para valor completo.
- Ao terminar: contrato n8n documentado + testes. PARAR.

Tu és o subagent BACKEND. Fatia S6 — reschedule via conversation.

1) ConversationReplyService: além de CONFIRMED/CANCELED, aceitar RESCHEDULE com nova data ISO validada; atualizar appointment.date + confirmationStatus RESCHEDULED se o enum já existir (migration ENUM só se precisares).
2) Ajustar schema inbound + fluxo ConversationState; testes.
3) Documentar contrato n8n (intent/action + suggestedDate) em docs/n8n-webhooks.md.
4) Reagendar manual no portal já é PUT appointment — não precisa UI nova no back.

Cuidado com races (padrão claim-first do projeto).
```

---

## 14 — FRONTEND S6 (depois do 13)

```
Contexto Aten AI — workspace c:\work\aten-ai
- Frontend Angular 17; agenda; .agent-skills/aten-ai/SKILL.md
- Escopo: SÓ fatia S6 FRONTEND (leve). Não tocar backend. Não simular WhatsApp na UI.
- Ao terminar: passos de verificação visual. PARAR.

Tu és o subagent FRONTEND. Fatia S6.

1) Se confirmationStatus=RESCHEDULED, badge "Remarcado" na agenda + data atualizada (vem do GET).
2) Escopo visual mínimo.
```

---

## 15 — BACKEND S7 (caixa mínimo)

```
Contexto Aten AI — workspace c:\work\aten-ai
- Backend Sequelize; migrations nullable → defaults; tenantId JWT; .agent-skills/aten-ai/SKILL.md
- Escopo: SÓ fatia S7 BACKEND. Sem gateway de pagamento. Sem NF-e. Sem estoque.
- Ao terminar: migration + testes. PARAR.

Tu és o subagent BACKEND. Fatia S7 — payment fields.

1) Migration appointments: amountCents INT NULL, paymentStatus ENUM('PENDING','PAID','WAIVED') default 'PENDING'.
2) Update via PUT existente ou PATCH dedicado; GET list e/ou dashboard metrics: soma amountCents PAID do dia (por tenant).
3) Testes. Sem Stripe/Pix gateway.
```

---

## 16 — FRONTEND S7 (depois do 15) — ÚLTIMO

```
Contexto Aten AI — workspace c:\work\aten-ai
- Frontend Angular 17; agenda + dashboard; .agent-skills/aten-ai/SKILL.md; máscaras BRL se existirem em shared/utils
- Escopo: SÓ fatia S7 FRONTEND. Não tocar backend. Fim da sequência de prompts.
- Ao terminar: passos de teste no browser. PARAR.

Tu és o subagent FRONTEND. Fatia S7.

1) Ao concluir consulta ou no detalhe/agenda: campo valor (R$) + ação marcar Pago (paymentStatus).
2) Dashboard: card "Recebido hoje" se a API tiver métrica; senão somar client-side só o dia carregado e documentar a limitação num comentário curto no código ou README da feature.
UX B2B clara; loading/disabled consistentes.
```

---

## Ordem rápida (checklist)

| # | Colar | Fatia |
|---|--------|--------|
| 1 | 01 BE | S0 status |
| 2 | 02 FE | S0 status |
| 3 | 03 BE | S1 badge |
| 4 | 04 FE | S1 badge |
| 5 | 05 BE | S2 staff |
| 6 | 06 FE | S2 staff |
| 7 | 07 BE | S3 RBAC |
| 8 | 08 FE | S3 RBAC |
| 9 | 09 BE | S4 profissional |
| 10 | 10 FE | S4 profissional |
| 11 | 11 BE | S5 vacina |
| 12 | 12 FE | S5 vacina |
| 13 | 13 BE | S6 reagendar |
| 14 | 14 FE | S6 reagendar |
| 15 | 15 BE | S7 caixa |
| 16 | 16 FE | S7 caixa |

Começa no **01**. Quando o agent disser que parou, abre chat novo e cola o **02**.
