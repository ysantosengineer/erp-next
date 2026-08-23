# UI e UX

## Princípios

- Interface objetiva para trabalho diário, responsiva e acessível por teclado.
- Componentes shadcn/ui são a base visual; Tailwind CSS trata composição e tokens.
- A interface informa estados de carregamento, vazio, erro, sucesso e ausência de permissão.
- Rótulos, mensagens e validações são claros em português do Brasil.

## Navegação

Após login, a aplicação oferece dashboard e menu lateral agrupado em Cadastros, Operações, Financeiro, Relatórios e Administração. Itens indisponíveis por permissão podem ser ocultados, mas a API continua sendo a autoridade de acesso.

Nesta fundação, a rota `/login` apresenta campos identificados de e-mail e senha, validação próxima ao campo, feedback de carregamento e controle para exibir a senha. A área autenticada possui sidebar, header com usuário/empresa, logout e dashboard sem indicadores empresariais fictícios.

Na administração, `/users` oferece pesquisa com debounce, filtro de status, paginação no servidor, criação, edição, status e papéis. `/roles` oferece criação, edição, exclusão confirmada e permissões agrupadas por módulo. Links e ações são exibidos conforme as permissões atuais; acesso direto sem permissão leva a `/unauthorized`.

Em Cadastros, `/suppliers` oferece pesquisa com debounce, filtros de status e PF/PJ, paginação, formulário dinâmico com endereço principal e confirmação de ativação/inativação. CPF/CNPJ, telefone e CEP recebem máscara apenas para entrada e apresentação. A tabela usa rolagem horizontal em telas menores.

Em `/products`, a listagem oferece busca com debounce, filtros de status, categoria, unidade e fornecedor, ordenação e paginação no servidor. Cadastro e edição usam páginas dedicadas (`/products/new` e `/products/:id/edit`) com seções de dados gerais, comerciais e logísticos. Valores são digitados no padrão brasileiro e convertidos para strings decimais canônicas apenas no transporte. Ações e rotas são condicionadas por `products.*`, e a tabela preserva rolagem horizontal em telas menores.

Em `/customers`, a listagem oferece busca com debounce, filtros de status e PF/PJ, paginação no servidor e tabela com limite de crédito formatado. Cadastro e edição usam formulário amplo dividido em identificação, contato e crédito, endereço principal e observações. CPF/CNPJ, telefone e CEP recebem máscara somente na interface; valores monetários são digitados no padrão brasileiro e enviados como strings decimais. A rota e as ações são condicionadas por `customers.*`, e a tabela preserva rolagem horizontal em telas menores.

Em `/inventory`, a tabela apresenta saldo por produto/endereço, unidade, estoque mínimo e indicação visual de estoque baixo, com busca e filtros. Ações separadas registram entrada, saída, ajuste e transferência conforme as permissões `inventory.*`; saídas e transferências exibem o saldo conhecido na origem, mas a API continua sendo a autoridade concorrente. `/inventory/movements` apresenta o histórico imutável com filtros por produto, endereço, tipo e período. Após sucesso, os formulários fecham, exibem feedback e atualizam saldos, agregados do produto e histórico sem atualização otimista.

## Padrões de tela

- Listagens: título, ação principal autorizada, filtros, tabela paginada e estado vazio com próximo passo.
- Formulários: campos agrupados, validação no cliente e servidor, erros próximos ao campo e prevenção de envio duplicado.
- Pedidos: cabeçalho, itens editáveis no rascunho, resumo de valores e confirmação explícita para transições irreversíveis.
- Exclusões lógicas e cancelamentos exigem confirmação e mostram o efeito operacional.

## Acessibilidade e responsividade

Usar elementos semânticos, foco visível, contraste adequado, nomes acessíveis e feedback não dependente apenas de cor. Em telas pequenas, tabelas devem preservar ações essenciais por meio de cards, rolagem controlada ou visualização de detalhes.
