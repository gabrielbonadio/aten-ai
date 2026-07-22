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

---

## Inbound (n8n → API)

### `POST /api/v1/conversations/reply`

O n8n (após triagem NLP) informa a intenção e a ação do tutor.

**Headers**

```http
Authorization: Bearer <N8N_WEBHOOK_SECRET>
Content-Type: application/json
```

**Body**

```json
{
  "tenantId": 1,
  "tutorPhone": "+5511987654321",
  "intent": "confirm_appointment",
  "action": "CONFIRMED"
}
```

| Campo | Obrigatório | Valores |
|-------|-------------|---------|
| `tenantId` | sim* | number (*ou JWT se a rota for autenticada no futuro) |
| `tutorPhone` | sim | E.164 idêntico ao outbound |
| `intent` | sim | `confirm_appointment` \| `reschedule_appointment` \| `cancel_appointment` |
| `action` | sim | `CONFIRMED` \| `CANCELED` |

**Fluxo no backend**

1. `getState(tenantId, tutorPhone)` — exige estado ativo (`expiresAt > now`)
2. Valida `expectedIntent === intent`
3. `AppointmentRepository.updateStatus(referenceId, …)`  
   - `CONFIRMED` → `confirmationStatus = CONFIRMED`  
   - `CANCELED` → `status = CANCELED`
4. `clearState(tenantId, tutorPhone)`

**Respostas**

| Status | Quando |
|--------|--------|
| `200` | Sucesso (`{ "message": "Resposta processada com sucesso." }`) |
| `400` | Sessão inexistente/expirada, desvio de intent, validação Joi |
| `401` | Secret ausente/inválido (`ensureWebhookSecret`) |
| `500` | Erro inesperado |

---

## Ordem recomendada no n8n (lembrete)

```text
Cron D-1 (API)
  → saveState(confirm_appointment) + webhook appointment.reminder
  → n8n envia WhatsApp
  → tutor responde
  → n8n NLP (intent + action)
  → POST /api/v1/conversations/reply
  → API confirma/cancela e limpa ConversationState
```

## Garbage collector

Job diário às **03:00** (horário local) chama `clearExpiredStates()` e remove linhas com `expiresAt <= NOW()`.
