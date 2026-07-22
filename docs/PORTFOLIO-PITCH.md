# Pitch — Aten AI (portfólio / entrevista)

## About (GitHub)

SaaS multi-tenant para clínicas veterinárias: portal Angular + API Node/Express/Sequelize, com automações de WhatsApp via n8n (lembretes D-1, follow-up D+3 e confirmação inbound com estado de conversa em MySQL).

## Currículo / LinkedIn (2–3 linhas)

Desenvolvi o **Aten AI**, SaaS B2B multi-tenant para clínicas veterinárias (Angular + Node.js + MySQL). Inclui ciclo completo de tutores, pets, agenda e prontuários, além de integração com n8n/WhatsApp: jobs de lembrete e follow-up, estado de conversa com TTL e endpoint inbound protegido por shared secret. Foco em isolamento por tenant, migrations, Docker Compose e testes de domínio (auth, multi-tenant, conversas).

## 5 perguntas de recrutador + respostas curtas

**1. Como vocês isolam dados entre clínicas?**  
O `tenantId` vem do JWT (`req.user`), nunca do body nas rotas autenticadas. Toda query de domínio filtra por `tenantId` (regra documentada no projeto).

**2. O que é “claim-first” nos lembretes?**  
Marcamos `reminderSentAt` no banco **antes** de disparar o webhook. Preferimos perder um lembrete a enviar dois WhatsApps se o job ou o UPDATE falhar no meio.

**3. Por que ConversationState no MySQL e não Redis?**  
MVP com menos infra: TTL em coluna + índice + GC diário. O acesso está atrás de Repository, então migrar para Redis depois não espalha Sequelize pelo domínio.

**4. Por que gravar o estado antes do dispatch do lembrete?**  
A mensagem chega ao tutor em segundos; se ele responder rápido e o estado ainda não existir, o inbound retorna “sessão não encontrada”. `await saveState` fecha essa race; se o save falhar, o lembrete ainda é enviado (warn, sem bloquear).

**5. Como o n8n autentica no inbound?**  
`Authorization: Bearer <N8N_WEBHOOK_SECRET>` validado com comparação timing-safe. Sem o secret, a API responde 401.

## Demo sugerida na entrevista (2 min)

1. Login no portal → agenda do dia  
2. Mostrar Swagger / health  
3. Explicar diagrama: reminder → n8n → WhatsApp → reply → confirmação  
4. Abrir `docs/n8n-webhooks.md` e um teste de `ConversationReplyService`

## Checklist antes de publicar / demo

- [ ] `JWT_SECRET` e `N8N_WEBHOOK_SECRET` fortes (não usar defaults)
- [ ] `FRONTEND_URL` apontando para a URL pública do portal (e-mails + CORS)
- [ ] `API_URL` no build do frontend = URL pública da API (browser)
- [ ] Migrations aplicadas (`npm run migrate` ou entrypoint Docker)
- [ ] CI verde no `main` (backend Jest + frontend `test:ci` + build)
- [ ] Fluxo smoke: signup → login → criar tutor/pet → agendamento
- [ ] (Opcional) n8n com header `Authorization: Bearer <N8N_WEBHOOK_SECRET>` no inbound
- [ ] Screenshots ou GIF no README (Prompt 6 / polish)
