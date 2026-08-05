# Requisitos

## Convenções

- Exclusão de registros transacionais deve ser lógica, por inativação ou cancelamento; não física.
- Operações devem respeitar permissões e registrar usuário, data e alterações relevantes.
- Valores monetários são armazenados em unidade menor (centavos) ou `Decimal` no banco; a decisão final é `Decimal(14,2)` no Prisma/PostgreSQL.

## Acesso e administração

- Usuários autenticam com e-mail e senha; a senha é armazenada somente em hash.
- Administradores podem criar, editar, inativar usuários e iniciar redefinição de senha.
- Um usuário pode possuir vários papéis; papéis agrupam permissões por recurso e ação.
- Usuários inativos e sessões invalidadas não podem acessar a API.

## Cadastros

- Clientes podem ser pessoa física ou jurídica, com nome, documento único quando informado, contatos, endereços, limite de crédito e status.
- Fornecedores possuem razão/nome, documento, contato, endereço e status.
- Produtos possuem SKU único, nome, categoria, preço de venda, custo, unidade, status e campos opcionais para EAN, NCM, peso, dimensões e imagem.
- Categorias organizam produtos e não podem ser removidas enquanto tiverem produtos ativos.
- Armazéns possuem nome e endereço opcional.

## Operações

- Pedidos de venda possuem cliente, itens, quantidades, preços congelados no item, descontos, totais e status: rascunho, confirmado, cancelado e faturado.
- Compras possuem fornecedor, itens, custos congelados no item, totais e status: rascunho, confirmado, recebido e cancelado.
- Confirmar venda reserva/baixa estoque somente segundo a política documentada na arquitetura; o MVP baixará estoque na confirmação. Estoque insuficiente bloqueia confirmação.
- Receber compra gera entrada de estoque. Cancelamentos não podem deixar saldos negativos e devem criar estorno quando aplicável.
- Cada alteração de estoque gera uma movimentação imutável com tipo, quantidade, origem e usuário responsável.

## Financeiro e relatórios

- Faturas representam valores a receber ou a pagar vinculados à venda ou compra.
- Pagamentos podem ser parciais; uma fatura é quitada quando a soma dos pagamentos válidos alcança o valor devido.
- O dashboard mostra vendas, compras, contas em aberto e alertas de estoque baixo no período selecionado.
- Relatórios do MVP oferecem filtros por período e exportação posterior, sem promessa de formato fiscal.

## Não funcionais

- A API deve expor OpenAPI, paginação, filtros e códigos HTTP consistentes.
- Entradas externas devem ser validadas com DTOs; respostas não expõem modelos Prisma diretamente.
- Datas são persistidas em UTC e exibidas no fuso configurado pelo usuário/empresa quando existir configuração.
- Acessos, falhas relevantes e operações administrativas devem gerar logs estruturados.
