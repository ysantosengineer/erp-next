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

## Padrões de tela

- Listagens: título, ação principal autorizada, filtros, tabela paginada e estado vazio com próximo passo.
- Formulários: campos agrupados, validação no cliente e servidor, erros próximos ao campo e prevenção de envio duplicado.
- Pedidos: cabeçalho, itens editáveis no rascunho, resumo de valores e confirmação explícita para transições irreversíveis.
- Exclusões lógicas e cancelamentos exigem confirmação e mostram o efeito operacional.

## Acessibilidade e responsividade

Usar elementos semânticos, foco visível, contraste adequado, nomes acessíveis e feedback não dependente apenas de cor. Em telas pequenas, tabelas devem preservar ações essenciais por meio de cards, rolagem controlada ou visualização de detalhes.
