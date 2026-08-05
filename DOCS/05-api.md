# API

## Convenções

- Base: `/api/v1`; JSON UTF-8; datas ISO 8601 em UTC.
- Autenticação: endpoints protegidos exigem JWT. Autorização é feita por permissão no servidor.
- Listagens aceitam `page` (inicia em 1), `pageSize` (máximo 100), `sort`, filtros documentados e devolvem `{ data, meta }`.
- Respostas usam DTOs. Erros seguem `{ statusCode, code, message, details?, requestId }`.
- `400` validação, `401` não autenticado, `403` sem permissão, `404` inexistente, `409` conflito de estado/unicidade e `422` regra de negócio.

## Recursos

| Recurso | Rotas principais |
| --- | --- |
| Auth | `POST /auth/login`, `POST /auth/change-password` |
| Usuários e acesso | `GET,POST /users`, `GET,PATCH /users/:id`, `POST /users/:id/deactivate`, `GET,POST /roles`, `GET,PATCH /roles/:id`, `GET /permissions` |
| Cadastros | `GET,POST /customers`, `/suppliers`, `/categories`, `/products`, `/warehouses`; `GET,PATCH /:resource/:id` |
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
- `POST /auth/login` retorna token de acesso com expiração de 15 minutos. `POST /auth/change-password` exige JWT e senha atual; não há refresh, logout com estado nem recuperação de senha no MVP.
