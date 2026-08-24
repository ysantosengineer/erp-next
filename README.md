# ERP Next

Monorepo do ERP Next para pequenas e médias empresas. O repositório contém uma aplicação web em Next.js, uma API NestJS, PostgreSQL via Prisma, autenticação, usuários, papéis e permissões, cadastros, estoque, inventário físico, compras, vendas e financeiro inicial.

## Pré-requisitos

- Node.js 24 LTS (consulte `.nvmrc`)
- npm 11 ou superior

## Instalação

```bash
npm install
cp .env.example .env
```

No Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

Antes de executar o seed local, substitua `SEED_ADMIN_PASSWORD` no seu `.env` por uma senha
exclusiva de desenvolvimento com ao menos 12 caracteres. O seed cria ou atualiza a empresa,
o usuário definido por `SEED_ADMIN_EMAIL`, o papel administrativo e o catálogo inicial de
permissões.

Defina também segredos JWT exclusivos e, para o frontend local, mantenha:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
WEB_ORIGIN=http://localhost:3000
AUTH_COOKIE_SECURE=false
```

Em produção, use HTTPS e `AUTH_COOKIE_SECURE=true`. Quando frontend e API estiverem em sites
distintos, configure também `AUTH_COOKIE_SAME_SITE=none`; com domínio próprio compartilhado,
prefira `lax`.

Para os testes HTTP com PostgreSQL real, copie `.env.test.example`, configure
`DATABASE_URL_TEST` exclusivamente para um banco ou schema terminado em `_test` e execute
`npm run test:e2e`. O runner aborta antes da limpeza se o destino não for reconhecido como teste.

## Execução

```bash
npm run dev
```

- Web: `http://localhost:3000`
- API: `http://localhost:3001/api/v1/health`
- Login: `http://localhost:3000/login`
- Usuários: `http://localhost:3000/users`
- Papéis e permissões: `http://localhost:3000/roles`
- Categorias: `http://localhost:3000/categories`
- Unidades de medida: `http://localhost:3000/units`
- Fornecedores: `http://localhost:3000/suppliers`
- Produtos: `http://localhost:3000/products`
- Clientes: `http://localhost:3000/customers`
- Depósitos: `http://localhost:3000/warehouses`
- Saldos de estoque: `http://localhost:3000/inventory`
- Reservas de estoque: `http://localhost:3000/inventory/reservations`
- Movimentações: `http://localhost:3000/inventory/movements`
- Inventários físicos: `http://localhost:3000/inventory/counts`
- Pedidos de compra: `http://localhost:3000/purchases/orders`
- Recebimentos de compras: `http://localhost:3000/purchases/receipts`
- Pedidos de venda: `http://localhost:3000/sales/orders`
- Contas a pagar: `http://localhost:3000/finance/payables`
- Contas a receber: `http://localhost:3000/finance/receivables`
- Fluxo de caixa: `http://localhost:3000/finance/cash-flow`

O estoque é alterado exclusivamente por entradas, saídas, ajustes ou transferências. Quantidades usam `Decimal(18,4)`, saldo negativo é bloqueado e saldo/movimentação/auditoria são confirmados na mesma transação serializável. O histórico não possui endpoints de edição ou exclusão.

O inventário físico captura um snapshot ao iniciar e bloqueia movimentações do depósito até aprovação ou cancelamento. Primeira contagem e recontagem não alteram saldo; a aprovação usa os mesmos ajustes transacionais do estoque, com referência ao inventário e rollback integral.

Pedidos de compra usam numeração humana por empresa, itens e custos congelados, aprovação e cancelamento auditados. Aprovar não altera estoque. O recebimento físico aceita parciais e múltiplas confirmações, gera entradas `PURCHASE_RECEIPT`, atualiza saldo e pedido na mesma transação e protege retries por idempotência.

Pedidos de venda usam numeração `SO-*` por empresa, snapshots, preços negociados, descontos e transições auditadas. Confirmar é comercial; reservar compromete o disponível por endereço sem alterar o físico, liberar devolve disponibilidade e expedir consome as reservas, gera saídas `SALES_ORDER` e reduz o físico atomicamente.

O financeiro usa títulos `FIN-*` unificados por empresa, apresentados separadamente como contas a pagar e receber. Valores são decimais, saldo/atraso são derivados e pagamentos/recebimentos parciais são históricos imutáveis protegidos por transação serializável e idempotência. O fluxo de caixa distingue previsto de realizado; integração bancária, contabilidade, estorno e geração automática por pedidos não fazem parte desta etapa.

## Sessão web

O access token é mantido apenas em memória. O refresh token é configurado pela API em cookie `HttpOnly` e rotacionado por `/auth/refresh`; ele não é armazenado pelo frontend. As rotas internas redirecionam para `/login` quando a sessão não pode ser recuperada e a sidebar usa permissões atuais de `/auth/me` apenas para controle visual.

As telas administrativas consomem paginação, filtros e mutações reais da API. O catálogo de permissões é consultado por `GET /api/v1/permissions`; permissões não podem ser criadas, alteradas ou removidas pela interface.

## Scripts

| Comando             | Descrição                                            |
| ------------------- | ---------------------------------------------------- |
| `npm run dev`       | Inicia web e API em modo de desenvolvimento.         |
| `npm run lint`      | Executa ESLint e verifica a formatação com Prettier. |
| `npm run typecheck` | Executa a verificação de tipos dos workspaces.       |
| `npm run test`      | Executa os testes dos workspaces.                    |
| `npm run test:e2e`  | Executa testes HTTP contra PostgreSQL isolado.       |
| `npm run build`     | Gera builds de produção.                             |
| `npm run format`    | Formata os arquivos com Prettier.                    |

## CI/CD e deploy

Pull requests para `main` passam por lint, typecheck, testes, build, PostgreSQL real, E2E e build
Docker. A implantação recomendada usa Vercel para o frontend, Render para a API Docker e Neon para
PostgreSQL. A ativação, os secrets, a proteção de branch, migrations, smoke test e rollback estão
documentados em `DOCS/10-deploy.md`. Use `.env.production.example` somente como referência de
nomes; valores reais nunca devem ser commitados.

## Estrutura

```text
apps/
  api/  # API NestJS
  web/  # Interface Next.js
DOCS/   # Documentação oficial do projeto
```

Os controles, a estratégia de isolamento E2E e o checklist de produção estão em
`DOCS/12-seguranca-e-testes.md`.
