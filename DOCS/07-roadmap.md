# Roadmap

## Sprint 0 — Fundação

Monorepo, Docker Compose para API/PostgreSQL/Redis, configuração de qualidade, CI inicial, variáveis de ambiente documentadas e OpenAPI básico.

## Sprint 1 — Acesso e administração

Autenticação, usuários, papéis, permissões, proteção de rotas, redefinição de senha e auditoria inicial.

Estado atual: autenticação, gestão de usuários/papéis, catálogo e atribuição de permissões, autorização, auditoria, login web, sessão por cookie HttpOnly, dashboard estrutural e interfaces administrativas `/users` e `/roles` estão implementados. As migrations estão aplicadas no ambiente PostgreSQL local; redefinição de senha continua fora desta entrega.

## Sprint 2 — Cadastros e catálogo

Clientes, fornecedores, categorias, produtos, armazéns, busca/paginação e formulários validados.

Estado atual: categorias, unidades de medida, fornecedores, produtos, clientes, depósitos e endereços de estoque estão implementados com isolamento por empresa, permissões, auditoria, migrations e interfaces autenticadas. Depósitos e endereços incluem códigos humanos normalizados, hierarquia física opcional, capacidade lógica, busca, filtros, paginação e status. O escopo funcional previsto para a Sprint 2 está implementado; a estabilização integrada continua sendo acompanhada pelas validações do projeto.

## Sprint 3 — Compras e estoque

Pedidos de compra, recebimento, saldo por armazém e movimentações imutáveis.

Estado atual: núcleo de estoque, inventário físico, pedidos e recebimentos de compra estão implementados. Aprovação permanece comercial; recebimentos parciais/múltiplos/totais geram entradas, atualizam saldos e pedidos atomicamente, com concorrência, idempotência, auditoria e interfaces dedicadas. A Sprint 3 aguarda somente estabilização integrada e o escopo de vendas posterior não foi antecipado.

## Sprint 4 — Vendas

Pedidos de venda, confirmação comercial, cancelamento e histórico do cliente. As Etapas 15 e 16 estão implementadas: numeração, snapshots, cálculos, reserva integral por endereço, liberação, expedição com baixa física, permissões, auditoria e interfaces. Picking avançado, separação parcial, transportadoras e faturamento permanecem posteriores.

## Sprint 5 — Financeiro e relatórios

Etapas 17 e 18 implementadas: títulos unificados a pagar/receber, baixas, fluxo de caixa, dashboard gerencial com dados reais e relatórios de vendas, compras, estoque e financeiro. Analytics respeita período, comparação, permissões e isolamento multiempresa. Exportação, contabilidade e integrações bancárias continuam fora do escopo.

## Sprint 6 — Produção e estabilização

Cobertura de fluxos críticos, segurança, observabilidade, backup, deploy e documentação de operação.

Cada sprint só é concluída quando seus critérios de aceitação, testes relevantes, OpenAPI e documentação estiverem atualizados.
