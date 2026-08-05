# Modelagem de banco

## Convenções

- Chaves primárias usam UUID; `createdAt` e `updatedAt` existem em entidades mutáveis.
- Valores monetários usam `Decimal(14,2)`; quantidades usam `Decimal(14,3)`.
- Status são enums; registros transacionais usam cancelamento, não exclusão física.
- Campos de documento e SKU recebem índices únicos quando informados e aplicáveis.

## Identidade e autorização

| Entidade | Campos principais | Relações |
| --- | --- | --- |
| User | id, name, email, passwordHash, authVersion, isActive, lastLoginAt | N:N Role; 1:N AuditLog |
| Role | id, name, description, isSystem | N:N User e Permission |
| Permission | id, resource, action, description | N:N Role; único por resource/action |

As associações são `UserRole(userId, roleId)` e `RolePermission(roleId, permissionId)`, ambas com chave composta única. `email` é persistido normalizado e possui índice único. `authVersion` é incrementado ao alterar senha ou inativar a conta e é comparado ao JWT em cada requisição protegida. Permissões são catalogadas por migrations, não por CRUD público.

## Cadastros e estoque

| Entidade | Campos principais | Relações |
| --- | --- | --- |
| Customer | id, type, name, document, email, phone, creditLimit, isActive | 1:N SalesOrder, Address |
| Supplier | id, name, document, email, phone, isActive | 1:N PurchaseOrder, Address |
| Address | id, street, number, city, state, postalCode | pertence a Customer ou Supplier |
| Category | id, name, description, isActive | 1:N Product |
| Product | id, sku, name, salePrice, costPrice, unit, isActive | N:1 Category; itens e Inventory |
| Warehouse | id, name, address, isActive | 1:N Inventory e StockMovement |
| Inventory | productId, warehouseId, quantity, minimumQuantity | único por productId/warehouseId |
| StockMovement | id, type, quantity, occurredAt, referenceType, referenceId | N:1 Product, Warehouse, User |

`Inventory` é o saldo atual; `StockMovement` é o livro razão imutável. A atualização dos dois ocorre na mesma transação.

## Documentos comerciais e financeiro

| Entidade | Campos principais | Relações |
| --- | --- | --- |
| SalesOrder | id, number, status, subtotal, discount, total, confirmedAt | N:1 Customer; 1:N SalesOrderItem; 0:N Invoice |
| SalesOrderItem | id, quantity, unitPrice, discount, total | N:1 SalesOrder e Product |
| PurchaseOrder | id, number, status, subtotal, discount, total, receivedAt | N:1 Supplier; 1:N PurchaseOrderItem; 0:N Invoice |
| PurchaseOrderItem | id, quantity, unitCost, discount, total | N:1 PurchaseOrder e Product |
| Invoice | id, direction, status, dueDate, amount, balance | opcionalmente ligada a venda ou compra; 1:N Payment |
| Payment | id, paidAt, amount, method, status, reference | N:1 Invoice; N:1 User |
| AuditLog | id, entity, entityId, action, before, after, occurredAt | N:1 User |

Regras de integridade: um item não pode ter quantidade ou preço negativo; `total = quantidade × preço - desconto`; uma fatura não pode apontar simultaneamente para compra e venda; pagamentos cancelados não compõem saldo.
