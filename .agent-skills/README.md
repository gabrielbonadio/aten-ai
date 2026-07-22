# Agent skills (Aten AI)

Esta pasta contém **junctions** para skills instaladas em:

- `%USERPROFILE%\.claude\skills\` (produto, segurança, UX, etc.)
- `%USERPROFILE%\.agents\skills\` (Node/TS, planos, debug, find-skills)

Assim o Cursor indexa caminhos relativos ao projeto e o agente segue os `SKILL.md` locais.

## Recriar junctions (outro PC ou clone limpo)

PowerShell, na raiz de `aten-ai`:

```powershell
.\.agent-skills\setup-agent-skills.ps1
```

## Skills ligadas

| Pasta | Origem | Uso principal |
|-------|--------|----------------|
| `security` | `.claude` | LGPD, auth, segredos, APIs seguras |
| `frontend-design` | `.claude` | UI/UX para SMB |
| `scalability` | `.claude` | multi-tenant e crescimento |
| `cost-reducer` | `.claude` | custos e eficiência |
| `customer-support` | `.claude` | suporte, erros, onboarding |
| `researcher` | `.claude` | pesquisa e validação |
| `self-healing` | `.claude` | resiliência e recuperação |
| `nodejs-best-practices` | `.agents` | boas práticas Node.js |
| `typescript-advanced-types` | `.agents` | tipos avançados em TypeScript |
| `writing-plans` | `.agents` | planear trabalho antes de implementar |
| `systematic-debugging` | `.agents` | debug sistemático |
| `find-skills` | `.agents` | descobrir skills úteis |
| `web-design-guidelines` | `.agents` | guidelines práticas de web design |

A regra `.cursor/rules/aten-ai-skill-stack.mdc` define **quando** ler cada uma.
