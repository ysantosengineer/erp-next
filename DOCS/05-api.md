# API

## Convenções

- Base: `/api/v1`; JSON UTF-8; datas ISO 8601 em UTC.
- Autenticação: endpoints protegidos exigem JWT. Autorização é feita por permissão no servidor.
- Listagens aceitam `page` (inicia em 1), `limit` (máximo 100), `sortBy`, `sortOrder`, filtros documentados e devolvem `{ data, meta }`.
- Respostas usam DTOs. Erros seguem `{ statusCode, code, message, details?, requestId }`.
- `400` validação, `401` não autenticado, `403` sem permissão, `404` inexistente, `409` conflito de estado/unicidade e `422` regra de negócio.

## Recursos

| Recurso | Rotas principais |
| --- | --- |
| Auth | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` |
| Usuários e acesso | `GET,POST /users`, `GET,PATCH /users/:id`, `PATCH /users/:id/status`, `PUT /users/:id/roles`, `GET,POST /roles`, `GET,PATCH,DELETE /roles/:id`, `PUT /roles/:id/permissions`, `GET /permissions` |
| Cadastros | `GET,POST /customers`, `/suppliers`, `/categories`, `/products`, `/warehouses`; `GET,PATCH /:resource/:id` |

### Categorias e unidades de medida

- `GET,POST /categories`, `GET,PATCH /categories/:id` e `PATCH /categories/:id/status` exigem, respectivamente, permissões `categories.read`, `categories.create`, `categories.read`, `categories.update` e `categories.manage_status`.
- `GET,POST /units`, `GET,PATCH /units/:id` e `PATCH /units/:id/status` seguem o mesmo contrato com permissões `units.*`.
- As duas listagens aceitam `page`, `limit`, `search`, `status`, `sortBy` e `sortOrder`.

### Fornecedores

- `GET /suppliers` e `GET /suppliers/:id` exigem `suppliers.read`.
- `POST /suppliers`, `PATCH /suppliers/:id` e `PATCH /suppliers/:id/status` exigem, respectivamente, `suppliers.create`, `suppliers.update` e `suppliers.manage_status`.
- A listagem aceita `page`, `limit`, `search`, `status`, `type`, `sortBy` e `sortOrder`. A pesquisa cobre nome, nome fantasia, documento e e-mail.
- `type` aceita `INDIVIDUAL` ou `COMPANY`. CPF/CNPJ é obrigatório, validado e normalizado pela API. O corpo pode conter um endereço principal opcional; `companyId` nunca é aceito.
- Documento duplicado na mesma empresa retorna `409 SUPPLIER_DOCUMENT_EXISTS`; documento inválido retorna `400 INVALID_SUPPLIER_DOCUMENT`; recurso de outra empresa retorna `404`.
| Vendas | `GET,POST /sales-orders`, `GET,PATCH /sales-orders/:id`, `POST /sales-orders/:id/confirm`, `POST /sales-orders/:id/cancel` |
| Compras | Rotas equivalentes em `/purchase-orders`, com `POST /:id/receive` |
| Estoque | `GET /inventory`, `GET /stock-movements`; movimentação manual somente por endpoint autorizado e motivo obrigatório |
| Financeiro | `GET,POST /invoices`, `GET /invoices/:id`, `POST /invoices/:id/payments`, `POST /payments/:id/cancel` |
| Relatórios | `GET /reports/dashboard`, `GET /reports/sales`, `GET /reports/inventory`, `GET /reports/financial` |

## Regras de contrato

- `POST` cria recursos e retorna `201`; comandos de transição retornam o recurso atualizado.
- `PATCH` aceita somente campos mutáveis no estado atual; itens de pedido não são alteráveis depois da confirmação.
- Os schemas de request e response são publicados no Swagger/OpenAPI e devem ser atualizados na mesma alteração de endpoint.
- Endpoints de escrita relevantes devem gerar evento de auditoria.
- Todos os endpoints de usuários e papéis exigem Bearer JWT e permissão específica. O `companyId` é obtido da identidade autenticada; recursos externos à empresa retornam `404`.
- `GET /permissions` exige `roles.manage_permissions` e retorna o catálogo global seguro com `id`, `code`, `resource`, `action` e `description`. Não existem endpoints para criar, alterar ou excluir permissões.
- `POST /users` exige `users.create`; quando `roleIds` não está vazio, exige também `users.manage_roles`. `POST /roles` exige `roles.create`; quando `permissionIds` não está vazio, exige também `roles.manage_permissions`.
- `GET /users` aceita `page`, `limit` (máximo 100), `search`, `status`, `sortBy` e `sortOrder`, retornando `{ data, meta: { page, limit, total, totalPages } }`.
- `POST /auth/login` retorna access token; o refresh token é enviado exclusivamente em cookie `HttpOnly`. O access token expira em 15 minutos. `POST /auth/refresh` usa e rotaciona o cookie de refresh, `POST /auth/logout` o revoga e limpa, e `GET /auth/me` exige access token e retorna dados seguros do usuário, empresa, papéis e permissões atuais. Alteração e recuperação de senha permanecem fora do escopo atual.
- A API aceita origem configurada em `WEB_ORIGIN` com credenciais; não é permitido usar origem curinga com cookies.
