# Modelagem de banco

## Convenções

- Chaves primárias usam UUID; `createdAt` e `updatedAt` existem em entidades mutáveis.
- Valores monetários usam `Decimal(14,2)`; quantidades usam `Decimal(14,3)`.
- Status são enums; registros transacionais usam cancelamento, não exclusão física.
- Campos de documento e SKU recebem índices únicos quando informados e aplicáveis.

## Identidade e autorização

| Entidade | Campos principais | Relações |
| --- | --- | --- |
| Company | id, name, document, isActive | 1:N User, Role, Category, UnitOfMeasure, Supplier, Product, Customer, Warehouse, StockLocation e AuditLog |
| User | id, companyId, name, email, passwordHash, authVersion, isActive, lastLoginAt | N:1 Company; N:N Role; 1:N AuditLog |
| Role | id, companyId, name, description, isSystem | N:1 Company; N:N User e Permission |
| Permission | id, resource, action, description | N:N Role; único por resource/action |

As associações são `UserRole(userId, roleId)` e `RolePermission(roleId, permissionId)`, ambas com chave composta única. `email` é persistido normalizado e permanece globalmente único porque o login não recebe identificador de empresa. O nome do papel é único por `companyId`. `authVersion` é incrementado ao alterar senha, inativar a conta ou mudar autorizações e é comparado ao JWT em cada requisição protegida. Permissões são um catálogo global versionado por seed/migrations, não por CRUD público. A camada de aplicação impede associações `UserRole` entre empresas.

## Cadastros e estoque

### Category

Categorias pertencem à empresa e usam `companyId`, `name`, `normalizedName`, `description`, `isActive`, timestamps e unicidade por `(companyId, normalizedName)`. A exclusão é lógica por status.

### UnitOfMeasure

Unidades de medida pertencem à empresa e usam `companyId`, `name`, `normalizedName`, `symbol`, `normalizedSymbol`, `description`, `isActive` e timestamps. Nome e símbolo são únicos dentro da empresa; o símbolo é normalizado para maiúsculas.

### Supplier e SupplierAddress

`Supplier` usa `SupplierType` (`INDIVIDUAL` ou `COMPANY`), pertence obrigatoriamente a `Company` e armazena `name`, `tradeName`, `document`, `email`, `phone`, `contactName`, `notes`, `isActive` e timestamps. `document` contém apenas dígitos e é único por `(companyId, document)`.

`SupplierAddress` pertence a `Supplier`, possui CEP, logradouro, número, complemento, bairro, cidade, UF, país e indicação de endereço principal. A relação é 1:N para permitir evolução, mas a interface inicial gerencia um único endereço principal. A exclusão em cascata não é usada; fornecedores e endereços devem ser preservados para vínculos históricos futuros.

### Product

`Product` pertence obrigatoriamente a `Company`, `Category` e `UnitOfMeasure`, podendo apontar para um `Supplier` principal. Armazena nome, descrição, SKU, código de barras, custo e venda em `Decimal(14,2)`, peso/dimensões/estoque mínimo em `Decimal(14,3)`, status e timestamps. Peso usa quilogramas e dimensões usam centímetros.

SKU e código de barras são únicos pelos pares `(companyId, sku)` e `(companyId, barcode)`. O PostgreSQL permite múltiplos valores nulos no índice do código de barras. Preços, medidas e estoque mínimo possuem restrições `CHECK` não negativas. As chaves estrangeiras usam `RESTRICT`; o ciclo de vida é controlado por `isActive`, sem exclusão física.

### Customer e CustomerAddress

`Customer` usa `CustomerType` (`INDIVIDUAL` ou `COMPANY`), pertence obrigatoriamente a `Company` e armazena `name`, `tradeName`, `document`, `email`, `phone`, `creditLimit`, `notes`, `isActive` e timestamps. CPF/CNPJ é obrigatório, contém somente dígitos e é único por `(companyId, document)`. `creditLimit` usa `Decimal(14,2)`, padrão zero e restrição `CHECK` não negativa.

`CustomerAddress` pertence a `Customer` e armazena CEP, logradouro, número, complemento, bairro, cidade, UF, país e indicação de principal. A relação 1:N permite evolução, mas um índice parcial garante no máximo um endereço principal por cliente. A interface inicial gerencia esse endereço principal. Chaves estrangeiras usam `RESTRICT`, preservando dados necessários a vínculos históricos futuros.

### Warehouse e StockLocation

`Warehouse` pertence obrigatoriamente a `Company` e armazena nome, código humano normalizado em maiúsculas, descrição, status e timestamps. O código é único por `(companyId, code)`. Há uma chave candidata adicional `(companyId, id)` para sustentar o vínculo composto dos endereços.

`StockLocation` representa um endereço dentro do depósito e pertence simultaneamente a `Company` e `Warehouse`. Armazena código, descrição, zona, corredor, prateleira, nível, posição, capacidade lógica opcional em `Decimal(14,3)`, status e timestamps. O código é único por `(warehouseId, code)` e a capacidade possui `CHECK` não negativa.

A chave estrangeira composta `(companyId, warehouseId) → Warehouse(companyId, id)` impede que um endereço seja associado a um depósito de outra empresa. As relações usam `RESTRICT`; o ciclo de vida é controlado por `isActive`. Depósitos com endereços ativos não podem ser inativados. Não existe endereço padrão implícito no modelo: o seed de desenvolvimento usa apenas o código convencional `DEFAULT`.

| Entidade | Campos principais | Relações |
| --- | --- | --- |
| Customer | id, companyId, type, name, tradeName, document, email, phone, creditLimit, notes, isActive | N:1 Company; 1:N CustomerAddress; futuramente SalesOrder |
| CustomerAddress | id, customerId, postalCode, street, number, complement, district, city, state, country, isPrimary | N:1 Customer |
| Supplier | id, companyId, type, name, tradeName, document, email, phone, contactName, notes, isActive | N:1 Company; 1:N SupplierAddress e Product; futuramente PurchaseOrder |
| SupplierAddress | id, supplierId, postalCode, street, number, complement, district, city, state, country, isPrimary | N:1 Supplier |
| Category | id, name, description, isActive | 1:N Product |
| Product | id, companyId, categoryId, unitId, primarySupplierId, name, description, sku, barcode, costPrice, salePrice, weight, dimensões, minimumStock, isActive | N:1 Company, Category, UnitOfMeasure e Supplier opcional; futuramente itens e Inventory |
| Warehouse | id, companyId, name, code, description, isActive | N:1 Company; 1:N StockLocation; futuramente Inventory e StockMovement |
| StockLocation | id, companyId, warehouseId, code, description, zone, aisle, rack, level, position, capacity, isActive | N:1 Company e Warehouse; futuramente saldos e movimentos |
| Inventory | productId, warehouseId, quantity, minimumQuantity | único por productId/warehouseId |
| StockMovement | id, type, quantity, occurredAt, referenceType, referenceId | N:1 Product, Warehouse, User |

`Inventory` e `StockMovement` ainda não estão implementados. Futuramente, `Inventory` será o saldo atual e `StockMovement` o livro razão imutável; a atualização dos dois deverá ocorrer na mesma transação.

## Documentos comerciais e financeiro

| Entidade | Campos principais | Relações |
| --- | --- | --- |
| SalesOrder | id, number, status, subtotal, discount, total, confirmedAt | N:1 Customer; 1:N SalesOrderItem; 0:N Invoice |
| SalesOrderItem | id, quantity, unitPrice, discount, total | N:1 SalesOrder e Product |
| PurchaseOrder | id, number, status, subtotal, discount, total, receivedAt | N:1 Supplier; 1:N PurchaseOrderItem; 0:N Invoice |
| PurchaseOrderItem | id, quantity, unitCost, discount, total | N:1 PurchaseOrder e Product |
| Invoice | id, direction, status, dueDate, amount, balance | opcionalmente ligada a venda ou compra; 1:N Payment |
| Payment | id, paidAt, amount, method, status, reference | N:1 Invoice; N:1 User |
| AuditLog | id, companyId, entity, entityId, action, before, after, occurredAt | N:1 User; N:1 Company opcional |

Regras de integridade: um item não pode ter quantidade ou preço negativo; `total = quantidade × preço - desconto`; uma fatura não pode apontar simultaneamente para compra e venda; pagamentos cancelados não compõem saldo.
