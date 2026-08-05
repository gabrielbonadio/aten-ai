# Matriz RBAC (ADMIN × MEMBER)

Fonte: rotas Express com `ensureRole(['ADMIN'])` + UX do portal (fatia S3).

| Recurso / ação | ADMIN | MEMBER |
|---|---|---|
| Dashboard (`GET /dashboard`) | ✅ | ❌ |
| Agenda (listar / criar / editar / status / excluir) | ✅ | ✅ |
| Pets (listar / criar / editar / perfil) | ✅ | ✅ |
| Pets **excluir** (`DELETE /pets/:id`) | ✅ | ❌ |
| Tutores (CRUD) | ✅ | ✅ |
| Prontuário **criar** / listar | ✅ | ✅ |
| Prontuário **excluir** (`DELETE /medical-records/:id`) | ✅ | ❌ (UI não expõe; API bloqueia) |
| Settings **ler** clínica | ✅ | ✅ (somente leitura no portal) |
| Settings **editar** (`PUT /settings`) | ✅ | ❌ |
| Equipe / convites (`/users*`) | ✅ | ❌ |
| TOTP 2FA (`/auth/totp*`) | ✅ | ❌ |
| Conta / logout / tema | ✅ | ✅ |

No portal: ações proibidas ficam ocultas; `403` da API → toast **Sem permissão**.
