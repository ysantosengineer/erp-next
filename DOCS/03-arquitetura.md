# Arquitetura

## Visão

O repositório será um monorepo com `apps/web` (Next.js), `apps/api` (NestJS) e `packages` para contratos, configuração e utilitários realmente compartilhados. Web e API são aplicações independentes e comunicam-se exclusivamente por HTTP.

## Backend

Cada domínio é um módulo NestJS. A direção de dependência é:

`controller -> application service -> repository/port -> Prisma -> PostgreSQL`

- Controllers tratam transporte, autenticação e DTOs; não contêm regras de negócio.
- Services aplicam casos de uso e regras transacionais.
- Repositories isolam a persistência e nunca são retornados pela API.
- Prisma acessa somente PostgreSQL. Redis serve cache, rate limiting ou filas quando a necessidade for documentada.
- Transações Prisma são obrigatórias em operações que modificam pedido/compra, estoque e financeiro de forma conjunta.

Módulos iniciais: `auth`, `users`, `roles`, `customers`, `suppliers`, `catalog`, `warehouses`, `sales`, `purchases`, `inventory`, `billing`, `audit` e `reports`.

## Segurança

- A API emite JWT de acesso de 15 minutos com `sub` e `authVersion` e refresh JWT de maior duração. Refresh tokens são persistidos somente como hash, rotacionados no uso e revogados no logout ou em mudanças de autorização; tokens nunca são registrados em logs.
- Em cada requisição protegida, guards carregam o usuário ativo, comparam `authVersion` e verificam permissões explícitas atuais no servidor. Papéis e permissões não são confiados ao JWT.
- Alterar senha ou inativar usuário incrementa `authVersion`, invalidando tokens anteriores no próximo uso.
- O catálogo de permissões é mantido no código/migrations; a API só o expõe para consulta. Redis pode ser usado para rate limiting e cache de autorização, desde que a mudança de usuário, papel ou permissão invalide o cache.
- `GET /permissions` expõe somente identificador, código, recurso, ação e descrição do catálogo global, protegido por `roles.manage_permissions`; não existe CRUD público de permissões.
- Senhas usam algoritmo de hash apropriado e comparação segura.
- Validação global rejeita campos não permitidos e transforma tipos de forma controlada.
- CORS, limite de cinco tentativas de login falhas por IP/e-mail em 15 minutos e cabeçalhos de segurança são configurados por ambiente.

## Isolamento por empresa

- `User` e `Role` pertencem a uma `Company`; `Permission` permanece como catálogo global.
- O contexto autenticado contém `userId`, `companyId` e `authVersion`, todos resolvidos novamente no banco pela estratégia JWT.
- Controllers não aceitam `companyId`. Services limitam consultas e mutações ao `companyId` autenticado e retornam `404` para recursos de outra empresa.
- Alterações de papéis e permissões invalidam as sessões afetadas por incremento de `authVersion` e revogação de refresh tokens.
- Categorias, unidades e fornecedores também pertencem a `Company`. O módulo de fornecedores valida CPF/CNPJ no backend, não aceita tenant externo e acessa endereços somente através de um fornecedor previamente limitado à empresa autenticada.
- Depósitos e endereços de estoque pertencem a `Company`. A relação de endereço com depósito usa chave estrangeira composta `(companyId, warehouseId)`, impedindo associação cross-tenant também no banco. Toda consulta de endereço combina `locationId`, `warehouseId` e `companyId`; IDs isolados nunca autorizam acesso.

## Frontend

Next.js organiza páginas por área funcional. Formulários usam React Hook Form e Zod; TanStack Query controla cache, carregamento e invalidação de dados remotos. Componentes visuais usam Tailwind CSS e shadcn/ui quando configurado. A interface não decide autorização: ela apenas reflete permissões já aplicadas pela API.

O frontend possui áreas públicas (`/login`) e autenticadas (`/` e `/unauthorized`). Um provider de autenticação mantém o access token apenas em memória, recupera a sessão por cookie HttpOnly e centraliza renovação, logout e tratamento de `401`. A proteção do cliente direciona a navegação, mas não substitui os guards da API.

As áreas administrativas `/users` e `/roles` permanecem no layout autenticado. Cada domínio possui tipos, schemas Zod, serviços HTTP, hooks TanStack Query e componentes próprios. Mutações invalidam somente as queries afetadas; alterações que possam invalidar a autorização atual renovam a sessão ou encerram o acesso conforme a resposta da API.

Os cadastros `/suppliers` e `/customers` seguem essa organização por domínio. `SupplierAddress` e `CustomerAddress` são entidades específicas porque os ciclos de vida dos domínios podem evoluir de forma independente. Ambos aceitam relação 1:N, enquanto a interface atual mantém somente um endereço principal. Validação e formatação estáveis de CPF, CNPJ, telefone e CEP são compartilhadas em utilitários, sem introduzir uma tabela polimórfica de endereços.

## Integrações e observabilidade

OpenAPI é o contrato público da API. Logs devem ser estruturados e correlacionados por request ID. Auditoria é persistida para mutações administrativas e transacionais. Saúde da aplicação deve expor endpoint sem dados sensíveis.

## Decisões atuais

- Banco PostgreSQL compartilhado com isolamento lógico por `companyId` nos módulos de acesso e administração.
- API REST versionada com prefixo `/api/v1`.
- Sem acesso direto do frontend ao banco e sem regras fiscais implícitas.
