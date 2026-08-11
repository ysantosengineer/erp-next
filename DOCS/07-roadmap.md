# Roadmap

## Sprint 0 — Fundação

Monorepo, Docker Compose para API/PostgreSQL/Redis, configuração de qualidade, CI inicial, variáveis de ambiente documentadas e OpenAPI básico.

## Sprint 1 — Acesso e administração

Autenticação, usuários, papéis, permissões, proteção de rotas, redefinição de senha e auditoria inicial.

Estado atual: autenticação, gestão de usuários/papéis, catálogo e atribuição de permissões, autorização, auditoria, login web, sessão por cookie HttpOnly, dashboard estrutural e interfaces administrativas `/users` e `/roles` estão implementados em código. A aplicação das migrations e os testes de integração com PostgreSQL permanecem pendentes; redefinição de senha continua fora desta entrega. A sprint ainda não está concluída.

## Sprint 2 — Cadastros e catálogo

Clientes, fornecedores, categorias, produtos, armazéns, busca/paginação e formulários validados.

## Sprint 3 — Compras e estoque

Pedidos de compra, recebimento, saldo por armazém e movimentações imutáveis.

## Sprint 4 — Vendas

Pedidos de venda, confirmação com baixa de estoque, cancelamento com estorno e histórico do cliente.

## Sprint 5 — Financeiro e relatórios

Faturas, pagamentos parciais, contas em aberto, dashboard e relatórios operacionais.

## Sprint 6 — Produção e estabilização

Cobertura de fluxos críticos, segurança, observabilidade, backup, deploy e documentação de operação.

Cada sprint só é concluída quando seus critérios de aceitação, testes relevantes, OpenAPI e documentação estiverem atualizados.
