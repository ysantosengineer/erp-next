# ERP Next

## Propósito

O ERP Next é um ERP web para pequenas e médias empresas comerciais. O objetivo do MVP é centralizar cadastros, vendas, compras, estoque e controles financeiros básicos em uma aplicação segura, auditável e preparada para crescer.

O projeto é um portfólio profissional Full Stack, mas deve adotar práticas compatíveis com software comercial: separação de responsabilidades, validação de dados, testes, observabilidade, documentação e entrega contínua.

## Público e perfis

- **Administrador:** configura a empresa, usuários, papéis e permissões.
- **Gestor:** acompanha indicadores e aprova operações sensíveis.
- **Vendas:** mantém clientes e registra pedidos de venda.
- **Compras/estoque:** mantém fornecedores, produtos, compras e movimentações.
- **Financeiro:** acompanha faturas e pagamentos.

## Escopo do MVP

1. Autenticação, usuários, papéis e permissões.
2. Cadastros de clientes, fornecedores, categorias e produtos.
3. Pedidos de venda e compras, com itens e cálculo de totais.
4. Armazéns, saldo de estoque e movimentações rastreáveis.
5. Faturas, pagamentos e visão financeira básica.
6. Dashboard, relatórios operacionais e trilha de auditoria.

Fora do MVP: emissão fiscal oficial, integração bancária, e-commerce e app mobile. O módulo de acesso já adota isolamento lógico por empresa para usuários e papéis; os módulos comerciais só poderão ser tornados multiempresa mediante modelagem explícita. Nenhuma regra fiscal deve ser inferida.

## Requisitos de qualidade

Cada módulo deve oferecer autenticação, autorização por permissão, validação de entradas, tratamento consistente de erros, logs estruturados, auditoria para ações sensíveis, testes relevantes e documentação de API.

## Stack obrigatória

### Frontend

Node.js, Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form e Zod.

### Backend

Node.js, NestJS, TypeScript, Prisma ORM, PostgreSQL, Redis, JWT e Swagger/OpenAPI.

### Infraestrutura

Docker, Docker Compose e GitHub Actions. Vercel pode hospedar o frontend e Railway ou AWS podem hospedar os serviços, conforme decisão registrada em `10-deploy.md`.

## Módulos e dependências

| Módulo | Depende de |
| --- | --- |
| Acesso | Usuários, papéis e permissões |
| Cadastros | Acesso |
| Compras | Fornecedores, produtos, armazéns |
| Vendas | Clientes, produtos, armazéns |
| Estoque | Produtos, armazéns, compras e vendas |
| Financeiro | Vendas e compras |
| Dashboard e relatórios | Dados dos módulos operacionais |

O dashboard gerencial e os relatórios básicos de vendas, compras, estoque e financeiro usam exclusivamente dados persistidos. Valores comerciais são identificados como “valor de pedidos” e não como faturamento fiscal.

## Evolução futura

WMS, BI, recursos de IA e aplicativo mobile devem consumir APIs versionadas do ERP, sem acesso direto ao banco de dados.
