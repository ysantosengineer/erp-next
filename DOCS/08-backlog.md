# Backlog priorizado

## P0 — necessário para o MVP

| ID | História | Critério de aceite resumido |
| --- | --- | --- |
| US001 | Como administrador, quero administrar usuários. | Criar, editar, inativar e impedir login de usuário inativo. |
| US002 | Como administrador, quero atribuir papéis e permissões. | A API bloqueia ações sem a permissão necessária. |
| US003 | Como operador, quero manter clientes, fornecedores, produtos e categorias. | Validações, busca e paginação funcionam. |
| US004 | Como compras, quero registrar e receber compras. | Recebimento cria movimentação e atualiza saldo atomicamente. |
| US005 | Como vendas, quero confirmar pedidos. | Estoque insuficiente bloqueia confirmação; confirmação baixa estoque. |
| US006 | Como financeiro, quero registrar pagamentos. | Pagamentos parciais atualizam saldo e status da fatura. |

## P1 — valor operacional

| ID | História | Critério de aceite resumido |
| --- | --- | --- |
| US007 | Como gestor, quero dashboard e relatórios. | Período filtrável e indicadores consistentes com os dados. |
| US008 | Como administrador, quero consultar auditoria. | Alterações críticas registram ator, data, ação e dados alterados. |
| US009 | Como operador, quero alertas de estoque baixo. | Produtos abaixo do mínimo são identificáveis no dashboard. |

## P2 — após o MVP

Exportação de relatórios, integrações, expansão do isolamento multiempresa para módulos comerciais, emissão fiscal, WMS, BI, IA e aplicativo mobile. Cada item deve ser refinado com regra de negócio, dependências e critérios de aceite antes de entrar em sprint.

## Estado de implementação

- US001 e US002 estão implementadas no backend e no frontend, com isolamento por empresa, controle visual por permissão, catálogo consultável e testes unitários baseados em mocks.
- A validação em banco real e os testes de integração permanecem pendentes pela indisponibilidade local de PostgreSQL/Docker; por isso essas histórias ainda não são consideradas concluídas.
- A interface de login, sessão autenticada, navegação por permissões e os CRUDs administrativos de usuários e papéis estão implementados. A validação manual integrada depende de API e PostgreSQL locais disponíveis.
- A parte de fornecedores da US003 está implementada em código com PF/PJ, CPF/CNPJ, endereço principal, busca, filtros, paginação, status e testes unitários. A US003 permanece aberta até os demais cadastros previstos e a validação integrada em PostgreSQL.
- A parte de produtos da US003 está implementada com SKU/código de barras únicos por empresa, categoria, unidade, fornecedor principal opcional, preços, dimensões, estoque mínimo, busca, filtros, paginação, status e testes. A US003 permanece aberta até clientes e armazéns.
