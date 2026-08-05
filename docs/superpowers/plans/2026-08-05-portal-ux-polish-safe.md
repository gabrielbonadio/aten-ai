# Plano safe — polish UX do portal Aten (inspiração, sem libs React)

**Data:** 2026-08-05  
**Stack:** Angular 17 + Tailwind 3 + Lucide (não React/shadcn)  
**Pré-requisito:** commit + push do frontend de produto (S0–S7) feito **antes** destas alterações — ponto de rollback.

## Objetivo

Melhorar clareza, feedback e micro-presença visual no portal B2B (clínica/vet) sem trocar design system, sem instalar Cult/Skiper/Watermelon, e sem colar componentes React do 21st.

## Não-objetivos (explícito)

- Não adicionar Framer Motion / registries shadcn.
- Não redesign full da marca nem theme genérico do 21st.
- Não scroll hijack, marquee, glow, 3D ou “landing effects” no shell autenticado.
- Não alterar backend nesta fatia.

## Baseline de rollback

| Momento | Ação |
|--------|------|
| Antes do polish | Tag ou commit na `main` com FE S0–S7 (este plano assume que já foi pushado) |
| Se não gostar | `git revert` do(s) commit(s) de polish **ou** `git checkout <sha-baseline> -- frontend/` |
| Preferência | 1 commit por fase (A → B → C) para reverter só o que incomodar |

Sugestão de tag local após o push do FE produto:

```bash
git tag fe-pre-ux-polish
```

## Princípios (vet SaaS)

1. Clareza > espetáculo.
2. Motion só para hierarquia/feedback (200–300ms, CSS ou `@angular/animations` leve).
3. Preservar emerald/zinc + dark mode já existentes.
4. Cada fase é testável no browser em &lt; 15 min.
5. 21st MCP / Cult / Skiper = **referência visual**; implementação sempre Angular nativa.

## Ficheiros candidatos (por fase)

| Fase | Tocar |
|------|--------|
| A | `frontend/src/styles.css` (ou global), shell/header comuns, toasts, `ui-block`, empty states partilhados |
| B | `agenda.component.*`, `dashboard.component.*`, `load-error.component.*` |
| C | `login` / `auth-page-shell` / signup (só polish de presença) |
| Ops | opcional `.21st/design.json` + 1 linha em `.cursor/rules/aten-ai-skill-stack.mdc` apontando inspo ≠ copy-paste |

---

## Fase A — Feedback e estados (baixo risco)

**Valor:** o utilizador entende “está a carregar / vazio / erro” sem ruído.

### Tasks

1. Inventariar empty states atuais (agenda, pets, dashboard) — alinhar copy + ícone + 1 CTA.
2. Uniformizar skeletons já usados no dashboard: mesma linguagem na agenda (se loading for bloco único, ok manter; se lista, preferir 2–3 rows pulse).
3. Confirmar disabled + spinner em ações críticas (já em S7 pagamento / status) — gap-fill onde faltar.
4. Micro-transição CSS global mínima:
   - `transition` em botões primários e rows da agenda (`border-color` / `background` 150–200ms).
   - Sem `transform` agressivo em listas longas (perf mobile).
5. Smoke browser: login → agenda (lista/vazia) → dashboard (admin).

**Aceite:** nada “piscando” demais; sensação mais sólida; facilmente revertível (CSS + poucos templates).

**Commit sugerido:** `style(portal): polish estados vazios e transições leves (fase A)`

---

## Fase B — Agenda + Dashboard (médio valor, ainda safe)

**Valor:** ecrãs do dia a dia mais legíveis.

### Tasks

1. **Agenda**
   - Hierarquia: horário / pet / meta secundária mais distinta (sem cards novos no hero/lista se já estiverem ok — só tipografia e gaps).
   - Pagamento (S7): agrupar visualmente badge + input + ações para não “espalhar” a row (layout, não lógica).
   - Empty filter: CTA “Ver mês atual” já existe — alinhar spacing com empty states da fase A.
2. **Dashboard**
   - Card “Recebido hoje” com tipografia estável (evitar saltos de layout no loading).
   - Lista “hoje”: hover consistente com agenda; opcional label de pagamento se `paymentStatus` vier na lista (só display).
3. **Load error:** mensagem curta + retry (já existe) — conferir tom B2B.

**Aceite:** densidades iguais em light/dark; zero mudança de API.

**Commit sugerido:** `style(portal): refinamentos agenda e dashboard (fase B)`

---

## Fase C — Auth / primeira impressão (opcional)

**Valor:** confiança na entrada; só se A+B agradarem.

### Tasks

1. Auth shell: ritmo de spacing + foco visível nos inputs (já quase lá).
2. 1–2 motions de entrada no shell (fade curto), respeitando `prefers-reduced-motion`.
3. Não redesenhar branding; brand permanece dominante nas páginas de auth se for o caso.

**Commit sugerido:** `style(portal): micro polish auth shell (fase C)`

---

## Uso das tools (durante implementação)

| Tool | Como usar | Como NÃO usar |
|------|-----------|----------------|
| 21st MCP | `search` / `get_inspiration` / sketch HTML-Tailwind → reescrever em Angular | Colar TSX React/shadcn no repo |
| Cult / Skiper / Watermelon | Screenshots mentais: empty state, list row, metric card | `npx shadcn add` no frontend |
| web-design-guidelines | Auditoria a11y/foco após fase B | Reescrever o app inteiro |

Opcional (ops, sem UI): criar `frontend/.21st/design.json` com constraints (“Angular 17”, “emerald/zinc”, “B2B clinic”, “no marquee”).

---

## Ordem de execução (checklist)

```text
[x] Tag/nota do baseline pós-push FE produto (`fe-pre-ux-polish`)
[x] Fase A → browser → commit
[x] Fase B → browser → commit
[ ] (opcional) Fase C → browser → commit
[ ] Se não gostar da fase N: git revert desse commit (ou checkout do path frontend/)
```

## Critério de paragem

Parar se qualquer fase:

- piorar legibilidade em dark mode;
- aumentar clutter na agenda;
- introduzir dependência React/animation pesada.

## Próximo passo humano

Dizer “aplica fase A” (ou A+B) depois do push do FE produto estar confirmado no remoto.
