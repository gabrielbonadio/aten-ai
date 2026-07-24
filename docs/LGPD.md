# LGPD — Aten AI

Documento operacional de privacidade e proteção de dados pessoais no Aten AI
(portal veterinário multi-tenant + automações WhatsApp via n8n).

Este texto **não** substitui parecer jurídico. Ajuste bases legais e prazos
ao contrato com cada clínica (controladora) e ao DPO/advogado da operação.

## Papéis

| Papel | Quem |
|-------|------|
| Controladora | Clínica (tenant) que cadastra tutores, pets e prontuários |
| Operadora | Operação do Aten AI (hospedagem, suporte, processamento) |
| Titulares | Tutores (pessoas físicas) cujos dados de contato são tratados |

## Dados tratados (resumo)

| Dado | Onde | Finalidade típica |
|------|------|-------------------|
| Nome, e-mail, telefone, endereço do tutor | MySQL `tutors` | Cadastro clínico, contato, WhatsApp |
| Dados do pet | MySQL `pets` | Atendimento |
| Sintomas, diagnóstico, prescrição | MySQL `medical_records` | Prontuário |
| Telefone em `conversation_states` | MySQL (TTL curto) | Confirmação de consulta via WhatsApp |
| Credenciais de usuário do portal | MySQL `users` / tokens | Autenticação |
| Logs da API | stdout / agregador | Operação e segurança |

## Medidas técnicas implementadas

### Logs

- Logger estruturado JSON (`logger.*`); jobs e webhooks **não** usam `console.*` com PII.
- Campos `email`, `phone`, `tutor_phone`, tokens e secrets são **mascarados** automaticamente (`maskPii` / `redactLogFields`).
- Retenção recomendada de logs: **90 dias** no agregador (CloudWatch, Datadog, etc.), alinhada a necessidade operacional. Ajuste se o contrato exigir menos.

### Criptografia em repouso (campos clínicos)

Quando `PII_ENCRYPTION_KEY` está definida (32 bytes em hex — `openssl rand -hex 32`):

- `medical_records.symptoms`
- `medical_records.diagnosis`
- `medical_records.prescription`

usam AES-256-GCM (`enc:v1:…`). Sem a chave, o comportamento permanece em claro (dev). Em production o boot **recomenda** a chave via warning.

Registros antigos sem prefixo continuam legíveis (migração gradual). Novos writes passam a cifrar.

### Telefone / e-mail do tutor

Permanecem em claro no MySQL porque são chave de negócio (lookup WhatsApp inbound, unicidade de e-mail, payloads n8n). Mitigações:

- Mascaramento em logs
- Acesso só autenticado + isolamento por `tenantId`
- TLS na borda (`docs/DEPLOY.md`)
- Cookies httpOnly para sessão do portal

Criptografia de telefone exigiria coluna de lookup (hash) — backlog documentado abaixo.

### Sessão e transporte

- Access/refresh em cookies httpOnly (quando habilitado no deploy)
- HTTPS obrigatório em produção
- Segredos de JWT / webhooks / DB validados no boot (`validateEnv`)

## Bases legais (orientativo)

Exemplos comuns — **confirmar com jurídico**:

- Execução de contrato / procedimento pré-contratual com a clínica
- Legítimo interesse para segurança (logs de auth, rate limit)
- Consentimento ou legítimo interesse para WhatsApp de lembrete/follow-up, conforme política da clínica

## Direitos do titular (Art. 18)

Canais sugeridos:

1. Titular solicita à clínica (controladora).
2. Clínica usa o portal (exportar/editar/excluir tutores e prontuários) ou abre chamado à operação Aten AI.
3. Operação atende em prazo acordado no DPA (meta interna: **15 dias úteis**).

Soft-delete (`paranoid`) em tutores/pets/prontuários: exclusão lógica; purge físico sob pedido e política de backup.

## Backups

- Scripts em `scripts/backup-mysql.*` — ver `docs/DEPLOY.md`.
- Backups herdam o mesmo nível de sensibilidade do banco; restringir acesso e retenção (ex.: 30 dias).

## Checklist de produção (LGPD)

- [ ] `PII_ENCRYPTION_KEY` definida e guardada fora do git (mesmo valor em todas as réplicas API/worker)
- [ ] Agregador de logs com retenção ≤ 90 dias e sem campos PII em claro
- [ ] DPA / termo entre operação Aten AI e cada clínica
- [ ] Política de privacidade / aviso na clínica sobre WhatsApp
- [ ] Teste de restore de backup

## Backlog

- Hash de telefone + cifrar `tutors.phone` / `email`
- Endpoint de exportação (portabilidade) por tutor
- Soft-delete + job de purge físico sob pedido
- Inventário formal de subprocessadores (n8n, Resend, host)
