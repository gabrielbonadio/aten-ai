# Contratos n8n ↔ Aten AI

Documentação dos webhooks **outbound** (API → n8n) e do endpoint **inbound** (n8n → API) usados nas automações de WhatsApp.

## Variáveis de ambiente

| Variável | Uso |
|----------|-----|
| `N8N_WEBHOOK_URL` | URL do webhook de entrada no n8n (outbound) |
| `N8N_WEBHOOK_SECRET` | Shared secret. Outbound: `Authorization: Bearer …`. Inbound: o n8n deve enviar o mesmo header. |

---

## Outbound (API → n8n)

Todos os eventos saem via `WebhookService.dispatch(event, payload)`.

Corpo HTTP:

```json
{
  "event": "<eventName>",
  "...": "campos do payload"
}
```

### `appointment.created`

Disparado após criar um agendamento.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `appointment_id` | UUID | ID do agendamento |
| `clinic_name` | string | Nome do tenant |
| `tutor_name` | string | Nome do tutor |
| `tutor_phone` | string | E.164 (`+55…`) |
| `pet_name` | string | Nome do pet |
| `appointment_datetime` | string | `pt-BR` (America/Sao_Paulo) |
| `appointment_datetime_iso` | string | ISO-8601 |
| `appointment_type` | enum | `VACCINE` \| `CONSULTATION` \| `SURGERY` \| `OTHER` |
| `appointment_status` | enum | status atual |

### `appointment.reminder`

Disparado pelo cron D-1 (08:00). **Antes** do dispatch, a API grava `ConversationState` com `expectedIntent = confirm_appointment` (TTL 24h).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `appointment_id` | UUID | Também é o `referenceId` do estado de conversa |
| `tenant_id` | number | Tenant |
| `clinic_name` | string | Nome da clínica |
| `tutor_name` | string | Nome do tutor |
| `tutor_phone` | string | E.164 — **mesma chave** do `ConversationState` |
| `pet_name` | string | Nome do pet |
| `pet_species` | string \| null | Espécie |
| `appointment_datetime` | string | `pt-BR` |
| `appointment_datetime_iso` | string | ISO-8601 |
| `appointment_type` | enum | Tipo |

### `appointment.followup`

Disparado pelo cron D+3 (09:00) para consultas `COMPLETED` sem follow-up.

Campos semelhantes ao reminder, com `days_since_appointment: 3`.

### `medical_record.created`

Disparado após criar prontuário.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `clinic_name` | string | Clínica |
| `tutor_name` | string | Tutor |
| `tutor_phone` | string | E.164 |
| `pet_name` | string | Pet |
| `prescription` | string \| null | Prescrição |

### `vaccine.reminder`

Disparado pelo job diário às **10:00** (horário local) para vacinações com `nextDueAt` no dia seguinte e `reminderSentAt IS NULL`.

**Claim-first:** a API grava `reminderSentAt` **antes** do dispatch (anti double-WhatsApp). MVP outbound only — **sem** `ConversationState` / inbound NLP nesta fatia.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `vaccination_id` | UUID | ID em `pet_vaccinations` |
| `tenant_id` | number | Tenant |
| `clinic_name` | string | Nome da clínica |
| `tutor_name` | string | Nome do tutor |
| `tutor_phone` | string | E.164 (`+55…`) |
| `pet_name` | string | Nome do pet |
| `pet_species` | string \| null | Espécie |
| `vaccine_name` | string | Label da vacina (ex.: `V10`, `Antirrábica`) |
| `applied_at_iso` | string \| null | ISO-8601 da aplicação (se houver) |
| `next_due_datetime` | string | `pt-BR` (America/Sao_Paulo) |
| `next_due_datetime_iso` | string | ISO-8601 da próxima dose |

Exemplo de corpo:

```json
{
  "event": "vaccine.reminder",
  "vaccination_id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "tenant_id": 1,
  "clinic_name": "Clínica Aten",
  "tutor_name": "Maria",
  "tutor_phone": "+5511987654321",
  "pet_name": "Thor",
  "pet_species": "Cachorro",
  "vaccine_name": "V10",
  "applied_at_iso": "2025-08-10T14:00:00.000Z",
  "next_due_datetime": "11/08/2026, 00:00:00",
  "next_due_datetime_iso": "2026-08-11T03:00:00.000Z"
}
```

---

## Inbound (n8n → API)

### `POST /api/v1/conversations/reply`

O n8n (após triagem NLP) informa a intenção e a ação do tutor.

**Headers**

```http
Authorization: Bearer <N8N_WEBHOOK_SECRET>
Content-Type: application/json
```

**Body — confirmar**

```json
{
  "tenantId": 1,
  "tutorPhone": "+5511987654321",
  "intent": "confirm_appointment",
  "action": "CONFIRMED"
}
```

**Body — cancelar** (a partir do lembrete D-1, o state espera `confirm_appointment`)

```json
{
  "tenantId": 1,
  "tutorPhone": "+5511987654321",
  "intent": "confirm_appointment",
  "action": "CANCELED"
}
```

**Body — reagendar** (`RESCHEDULE` + `suggestedDate` ISO futura)

No fluxo do lembrete D-1 o `ConversationState.expectedIntent` é `confirm_appointment`. O n8n deve reenviar **o mesmo** `intent` do state (não inventar `reschedule_appointment` nesse fluxo), com `action: "RESCHEDULE"`:

```json
{
  "tenantId": 1,
  "tutorPhone": "+5511987654321",
  "intent": "confirm_appointment",
  "action": "RESCHEDULE",
  "suggestedDate": "2026-08-20T15:00:00.000Z"
}
```

Se no futuro outro outbound gravar `expectedIntent = reschedule_appointment`, o inbound usa esse intent + `RESCHEDULE` + `suggestedDate`.

| Campo | Obrigatório | Valores |
|-------|-------------|---------|
| `tenantId` | sim | number |
| `tutorPhone` | sim | E.164 idêntico ao outbound (não logar — PII) |
| `intent` | sim | Deve ser **igual** a `ConversationState.expectedIntent` (`confirm_appointment` \| `reschedule_appointment` \| `cancel_appointment`) |
| `action` | sim | `CONFIRMED` \| `CANCELED` \| `RESCHEDULE` |
| `suggestedDate` | só se `RESCHEDULE` | ISO-8601 **futura**; proibido nas outras actions |

**Efeitos no agendamento** (`referenceId` do state)

| action | Mutação |
|--------|---------|
| `CONFIRMED` | `confirmationStatus = CONFIRMED` |
| `CANCELED` | `status = CANCELED` |
| `RESCHEDULE` | `date = suggestedDate` + `confirmationStatus = RESCHEDULED` (enum já existente) |

**Fluxo no backend**

1. `getState(tenantId, tutorPhone)` — exige estado ativo (`expiresAt > now`)
2. Valida `expectedIntent === intent`
3. Mutação claim-first no appointment (grava antes de limpar o state)
4. `clearState(tenantId, tutorPhone)`

**Respostas**

| Status | Quando |
|--------|--------|
| `200` | Sucesso (`{ "message": "Resposta processada com sucesso." }`) |
| `400` | Sessão inexistente/expirada, desvio de intent, `suggestedDate` inválida/passada, validação Joi |
| `401` | Secret ausente/inválido (`ensureWebhookSecret`) |
| `500` | Erro inesperado |

Reagendar **pelo portal** continua sendo `PUT /appointments/:id` (sem UI nova nesta fatia).

---

## Ordem recomendada no n8n (lembrete)

```text
Cron D-1 (API)
  → saveState(confirm_appointment) + webhook appointment.reminder
  → n8n envia WhatsApp
  → tutor responde
  → n8n NLP (intent + action [+ suggestedDate])
  → POST /api/v1/conversations/reply
  → API confirma / cancela / reagenda e limpa ConversationState
```

## Garbage collector

Job diário às **03:00** (horário local) chama `clearExpiredStates()` e remove linhas com `expiresAt <= NOW()`.
