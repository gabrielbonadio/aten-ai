# Roadmap de produto — fechar gaps da clínica (staff + operação)

> Documento de **prioridade de produto**, não plano de implementação passo a passo.
> Origem: análise de valor para veterinário empreendedor com funcionários (ago/2026).

**Goal:** Tornar o Aten utilizável no dia a dia de uma clínica com equipe, sem virar ERP.

**Princípio:** WhatsApp operacional continua o diferencial; as features abaixo destravam a *adoção* por quem tem funcionários.

---

## Como ler dificuldade

| Nível | Significado | Ordem de grandeza* |
|-------|-------------|--------------------|
| **Baixa** | UI ou fluxo em cima de API/modelo já existentes | ~1–3 dias |
| **Média** | Modelo + API + UI novos, padrões já conhecidos no repo | ~1–2 semanas |
| **Alta** | Domínio novo, jobs/n8n, ou decisão de produto ambígua | ~2–4+ semanas |
| **Muito alta** | ERP / compliance / integrações externas pesadas | mês(es) — fora deste roadmap |

\*Uma pessoa familiarizada com o monorepo; sem contar n8n/templates WhatsApp de produção.

---

## Estado que já ajuda (não recomeçar do zero)

| Capacidade | Estado |
|------------|--------|
| Roles `ADMIN` / `MEMBER` | Modelo + `ensureRole` existem |
| `PATCH` status agenda (`SCHEDULED` / `COMPLETED` / `CANCELED`) | API existe; portal quase não usa |
| `confirmationStatus` + jobs D-1 / D+3 | Backend + n8n; D+3 exige `COMPLETED` |
| `veterinarianId` em prontuário | Grava o user logado |
| Multi-tenant + soft delete | Maduro |

---

## Release 1 — “A clínica com equipe usa o Aten” (MVP vendável)

**Porquê primeiro:** sem staff + fecho de consulta, o app fica no telemóvel do dono.

| # | Feature | Valor para o dono | Dificuldade | Notas de escopo |
|---|---------|-------------------|-------------|-----------------|
| R1.1 | **Convite / gestão de funcionários** | Recepção e vet entram no mesmo tenant | **Média** | Invite por e-mail (token como reset), listar users, desativar; roles ADMIN/MEMBER. Sem SSO. |
| R1.2 | **RBAC alinhado à recepção vs vet** | Cada um faz só o que precisa | **Baixa–média** | Fechar DELETEs e settings; permitir agenda para MEMBER; documentar matriz de permissões. |
| R1.3 | **Status da consulta na UI** | Fechou o dia; desbloqueia follow-up D+3 | **Baixa** | Botões: Concluída / Não compareceu (→ CANCELED ou status dedicado) / Cancelada. API `updateStatus` já existe. |
| R1.4 | **Marcar COMPLETED ao criar prontuário** | Consulta não fica “fantasma” | **Baixa** | Ao gravar prontuário ligado a appointment, opcionalmente `COMPLETED`. |

**Saída do Release 1:** clínica de 2–5 pessoas trabalha no portal; WhatsApp D+3 passa a fazer sentido.

**Risco principal:** invite e-mail (Resend já existe) + não deixar MEMBER escalar a ADMIN sem querer.

---

## Release 2 — “O diferencial WhatsApp fica completo”

**Porquê a seguir:** reforça a história de venda sem abrir frente de caixa/estoque.

| # | Feature | Valor | Dificuldade | Notas |
|---|---------|-------|-------------|-------|
| R2.1 | **Vacinas: próximo reforço** | “Manda zap quando der a dose” | **Alta** | Tabela/protocolo simples (tipo + intervalo) ou “próxima data” no pet; job/lembrete similar ao D-1; UI no perfil do pet. Começar com **data manual + lembrete**, não protocolo completo V10. |
| R2.2 | **Reagendar via WhatsApp** | Tutor: “só posso quinta” | **Alta** | Estender ConversationState + n8n NLP; UI/API remarcar data; cuidado com race e claim-first. |
| R2.3 | **Visibilidade de confirmação na agenda** | Recepção vê quem confirmou | **Baixa** | Badge `confirmationStatus` na lista/agenda (campo já existe). |
| R2.4 | **Profissional na agenda** | Quem atende o quê | **Média** | `veterinarianId` (ou `assignedUserId`) em Appointment + filtro “minha agenda”. |

**Saída do Release 2:** história “agenda + WhatsApp de ponta a ponta” credível numa demo.

**Risco principal:** R2.1 e R2.2 competem por tempo — preferir **vacina simples (data + lembrete)** antes de NLP de reagendamento se o recurso for curto.

---

## Release 3 — “Paga-se sozinho” (caixa mínimo)

**Porquê depois:** sem substituir o ERP; só amarrar atendimento → dinheiro.

| # | Feature | Valor | Dificuldade | Notas |
|---|---------|-------|-------------|-------|
| R3.1 | **Valor + status pagamento no appointment** | Total do dia / pendentes | **Média** | Campos `amountCents`, `paymentStatus` (PENDING/PAID/WAIVED); painel simples no dashboard. Sem NF-e. |
| R3.2 | **Catálogo mínimo de serviços** | Preço padrão por tipo | **Média** | Tabela `services` por tenant ou preços fixos nos tipos atuais. Evitar stock. |
| R3.3 | **Relatório do dia/semana** | Dono olha faturamento | **Baixa–média** | Soma por período; CSV opcional. |

**Fora do Release 3 (propositalmente):** estoque, comissão, NF-e, gateway de pagamento do SaaS (Stripe) — tracks separados.

---

## Fora de escopo próximo (não planejar agora)

| Ideia | Porquê adiar |
|-------|----------------|
| App desktop Electron/Tauri | Não adiciona valor clínico; auth/cookies a tratar depois |
| Migrar MySQL → Supabase | Custo sem ganho de produto |
| ERP estoque / farmácia / centro cirúrgico | Perfil hospital; dilui diferencial |
| App do tutor | Outro produto |
| Telemedicina | Compliance + vídeo |
| Cobrança do plano Free/Pro (billing SaaS) | Só quando houver clientes pagantes reais |

---

## Ordem recomendada (sequência)

```text
R1.3 Status UI ──► R1.4 COMPLETED no prontuário ──► R1.1 Convite staff ──► R1.2 RBAC fino
        │
        ▼
R2.3 Badge confirmação ──► R2.4 Agenda por vet ──► R2.1 Vacina+lembrete ──► R2.2 Reagendar zap
        │
        ▼
R3.1 Pagamento simples ──► R3.2 Serviços ──► R3.3 Relatório
```

**Quick wins primeiro (R1.3, R1.4, R2.3):** dias, desbloqueiam métricas e demos.

**Maior ROI por esforço:** R1.1 (staff) — sem isso, o empreendedor com funcionários não adota.

**Maior diferencial de marketing:** R2.1 (vacina + WhatsApp) e R2.2 (reagendar).

---

## Matriz esforço × impacto (resumo)

| Feature | Impacto dono | Esforço | Prioridade |
|---------|--------------|---------|------------|
| Status consulta na UI | Alto | Baixo | P0 |
| COMPLETED ao abrir prontuário | Alto | Baixo | P0 |
| Convite de staff | Crítico | Médio | P0 |
| RBAC recepção/vet | Alto | Baixo–médio | P0 |
| Badge confirmação | Médio | Baixo | P1 |
| Agenda por profissional | Alto | Médio | P1 |
| Vacina + lembrete | Muito alto | Alto | P1 |
| Reagendar WhatsApp | Alto | Alto | P2 |
| Caixa mínimo | Alto* | Médio | P2 |
| Relatório faturamento | Médio | Baixo–médio | P3 |

\*Alto se a clínica ainda não tiver outro sistema de caixa; senão, “nice to have” ao lado do software antigo.

---

## Critérios de “Release 1 pronto”

- [ ] ADMIN convida MEMBER por e-mail; MEMBER faz login e vê só o tenant dele
- [ ] Recepção marca Concluída / Cancelada / Não compareceu na agenda
- [ ] Follow-up D+3 dispara em ambiente com n8n após marcar COMPLETED
- [ ] Matriz ADMIN vs MEMBER documentada e coberta por testes de rota
- [ ] Demo de 3 minutos: convite → agenda → concluir → (opcional) ver job/follow-up

---

## Próximo passo quando for implementar

Abrir um **plano de implementação** só do Release 1 (convite + status UI + RBAC), no formato task-by-task em `docs/superpowers/plans/`, antes de tocar em vacinas ou caixa.
