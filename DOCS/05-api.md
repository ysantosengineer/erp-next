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

### Produtos

- `GET /products` e `GET /products/:id` exigem `products.read`.
- `POST /products`, `PATCH /products/:id` e `PATCH /products/:id/status` exigem, respectivamente, `products.create`, `products.update` e `products.manage_status`.
- A listagem aceita `page`, `limit`, `search`, `status`, `categoryId`, `unitId`, `supplierId`, `sortBy` e `sortOrder`. A pesquisa cobre nome, SKU, código de barras e descrição.
- O corpo nunca aceita `companyId`. Categoria e unidade são obrigatórias; fornecedor principal é opcional. Novos relacionamentos devem pertencer à empresa autenticada e estar ativos.
- Valores monetários são strings decimais com duas casas no response; peso, dimensões e estoque mínimo são strings com três casas. SKU é normalizado para maiúsculas e código de barras aceita somente 8 a 14 dígitos.
- Duplicidades retornam `409 PRODUCT_SKU_EXISTS` ou `409 PRODUCT_BARCODE_EXISTS`; relacionamento inativo retorna `422`; recurso ou relacionamento externo à empresa retorna `404`.

### Clientes

- `GET /customers` e `GET /customers/:id` exigem `customers.read`.
- `POST /customers`, `PATCH /customers/:id` e `PATCH /customers/:id/status` exigem, respectivamente, `customers.create`, `customers.update` e `customers.manage_status`.
- A listagem aceita `page`, `limit`, `search`, `status`, `type`, `sortBy` e `sortOrder`. A pesquisa cobre nome, nome fantasia, documento, e-mail e telefone; a ordenação usa uma whitelist com nome, documento, limite de crédito e timestamps.
- `type` aceita `INDIVIDUAL` ou `COMPANY`. CPF/CNPJ é obrigatório, validado e normalizado pela API. O corpo pode conter um endereço principal opcional; `companyId` e `isActive` nunca são aceitos nos endpoints de criação e edição.
- `creditLimit` é recebido e devolvido como string decimal canônica com duas casas, sendo persistido em `Decimal(14,2)`. Valores negativos são rejeitados.
- Documento duplicado na mesma empresa retorna `409 CUSTOMER_DOCUMENT_EXISTS`; documento inválido retorna `400 INVALID_CUSTOMER_DOCUMENT`; recurso de outra empresa retorna `404 CUSTOMER_NOT_FOUND`.

### Depósitos e endereços de estoque

- `GET /warehouses` e `GET /warehouses/:id` exigem `warehouses.read`; criação, edição e status exigem, respectivamente, `warehouses.create`, `warehouses.update` e `warehouses.manage_status`.
- A listagem de depósitos aceita `page`, `limit`, `search`, `status`, `sortBy` e `sortOrder`. O response inclui `locationCount`, calculado pela API. Códigos são normalizados para maiúsculas e únicos por empresa; duplicidade retorna `409 WAREHOUSE_CODE_EXISTS`.
- Endereços usam as rotas contextuais `GET,POST /warehouses/:warehouseId/locations`, `GET,PATCH /warehouses/:warehouseId/locations/:id` e `PATCH /warehouses/:warehouseId/locations/:id/status`, protegidas pelas permissões equivalentes `stock_locations.*`.
- A listagem de endereços aceita `page`, `limit`, `search`, `status`, `zone`, `sortBy` e `sortOrder`, e devolve `{ warehouse, data, meta }` para fornecer o contexto seguro do depósito sem exigir uma segunda permissão. Capacidade é uma string decimal canônica com três casas e não pode ser negativa.
- Depósitos e endereços de outra empresa retornam `404`. A criação e reativação de endereço em depósito inativo retornam `422 WAREHOUSE_INACTIVE`; a inativação de depósito com endereços ativos retorna `422 WAREHOUSE_HAS_ACTIVE_LOCATIONS`.

### Saldos e movimentações de estoque

- `GET /inventory`, `GET /inventory/:id`, `GET /inventory/products/:productId` e `GET /inventory/options` exigem `inventory.read`. A listagem filtra por busca, produto, depósito e endereço.
- `GET /inventory/movements` e `GET /inventory/movements/:id` exigem `inventory.movements.read`; o histórico filtra por produto, depósito, endereço, tipo, período e responsável.
- `POST /inventory/movements/entry`, `/exit`, `/adjustment` e `/transfer` exigem, respectivamente, `inventory.entry`, `inventory.exit`, `inventory.adjust` e `inventory.transfer`.
- Quantidades são strings decimais positivas com até quatro casas. Saldo insuficiente retorna `422 INSUFFICIENT_STOCK`; produto, endereço ou depósito inativo retorna `422` com código específico; recurso inexistente ou externo à empresa retorna `404 RESOURCE_NOT_FOUND`, sem aceitar `companyId` no request.
- `idempotencyKey` é opcional. Repetição idêntica retorna a movimentação original; reutilização divergente retorna `409 IDEMPOTENCY_KEY_REUSED`.
| Vendas | `GET,POST /sales-orders`, `GET,PATCH /sales-orders/:id`, `POST /sales-orders/:id/confirm`, `POST /sales-orders/:id/cancel` |
| Compras | Rotas equivalentes em `/purchase-orders`, com `POST /:id/receive` |
| Estoque | `GET /inventory`, `GET /inventory/products/:productId`, `GET /inventory/movements`; comandos em `/inventory/movements/{entry,exit,adjustment,transfer}` |
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
