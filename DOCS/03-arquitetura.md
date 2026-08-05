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

- JWT de curta duração é enviado via mecanismo definido na implementação; tokens nunca são registrados em logs.
- Guards autenticam o usuário e verificam permissões explícitas.
- Senhas usam algoritmo de hash apropriado e comparação segura.
- Validação global rejeita campos não permitidos e transforma tipos de forma controlada.
- CORS, rate limiting e cabeçalhos de segurança são configurados por ambiente.

## Frontend

Next.js organiza páginas por área funcional. Formulários usam React Hook Form e Zod; TanStack Query controla cache, carregamento e invalidação de dados remotos. Componentes visuais usam Tailwind CSS e shadcn/ui. A interface não decide autorização: ela apenas reflete permissões já aplicadas pela API.

## Integrações e observabilidade

OpenAPI é o contrato público da API. Logs devem ser estruturados e correlacionados por request ID. Auditoria é persistida para mutações administrativas e transacionais. Saúde da aplicação deve expor endpoint sem dados sensíveis.

## Decisões atuais

- Banco único PostgreSQL no MVP, sem multi-tenancy.
- API REST versionada com prefixo `/api/v1`.
- Sem acesso direto do frontend ao banco e sem regras fiscais implícitas.
