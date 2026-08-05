# Requisitos

## Convenções

- Exclusão de registros transacionais deve ser lógica, por inativação ou cancelamento; não física.
- Operações devem respeitar permissões e registrar usuário, data e alterações relevantes.
- Valores monetários são armazenados em unidade menor (centavos) ou `Decimal` no banco; a decisão final é `Decimal(14,2)` no Prisma/PostgreSQL.

## Autenticação e controle de acesso

### Requisitos funcionais

- Usuários devem autenticar-se com e-mail e senha para acessar recursos protegidos.
- O sistema deve disponibilizar login e alteração de senha para usuário autenticado. O logout do MVP remove o token do cliente; não há endpoint nem persistência de sessão.
- Usuários com a permissão `access:manage` devem poder criar, consultar, editar, inativar e alterar papéis de usuários. Contas não são excluídas fisicamente.
- Usuários com a permissão `roles:manage` devem poder criar, editar e atribuir papéis. Um usuário pode possuir mais de um papel, e um papel pode ser atribuído a vários usuários.
- Permissões devem ser definidas pelo par **recurso** e **ação** (por exemplo, `users:read` e `sales-orders:confirm`). O catálogo é controlado pelo sistema e somente pode ser consultado pela API; papéis agrupam essas permissões.
- A API deve autenticar toda rota protegida e autorizar cada ação com base nas permissões atuais do usuário autenticado.
- Inativar um usuário ou alterar sua senha deve invalidar imediatamente seus tokens de acesso emitidos anteriormente.
- Logins bem-sucedidos e falhos, alterações de senha, usuários e papéis devem gerar registros de auditoria.

### Requisitos não funcionais

- Senhas são persistidas somente em hash não reversível; nunca em texto puro, logs ou respostas da API.
- O token JWT de acesso expira em 15 minutos e contém somente o identificador do usuário e sua versão de autenticação. Papéis e permissões não são incluídos no token.
- A cada requisição protegida, o servidor deve confirmar que o usuário está ativo, comparar sua versão de autenticação e consultar suas permissões atuais. A interface não substitui essa verificação.
- Cada combinação de IP e e-mail pode realizar no máximo cinco tentativas de login falhas em 15 minutos. A sexta tentativa recebe `429`; a resposta de falha não revela se a conta existe ou está ativa.
- A senha deve ter entre 12 e 128 caracteres e não pode ser igual à senha atual. A implementação pode acrescentar regras mais rígidas, desde que documentadas.
- A resposta para credenciais inválidas, e-mail inexistente e usuário inativo deve ter o mesmo código e mensagem genérica.
- Eventos de segurança devem registrar data em UTC, `requestId`, ator quando autenticado, ação, entidade/identificador afetado e resumo seguro da alteração, sem credenciais ou tokens.
- Os fluxos de login, autorização, inativação e alteração de senha devem possuir testes unitários e de integração.

### Regras de negócio

- O e-mail do usuário é obrigatório, único sem distinção entre maiúsculas e minúsculas e normalizado antes da persistência.
- Somente usuários ativos podem obter token. Cada token carrega a versão de autenticação vigente; o guard rejeita token cuja versão não corresponda à do usuário.
- Alterar a senha ou inativar o usuário incrementa sua versão de autenticação. Assim, o próximo uso de qualquer token anterior é rejeitado.
- Ações administrativas exigem permissões específicas; o nome de um papel não concede autorização por si só.
- O catálogo de permissões é versionado junto ao código e não pode ser criado, editado ou removido pela API. Papéis podem ser mantidos apenas com permissões existentes no catálogo.
- Alterar um papel ou a atribuição de papéis a um usuário afeta a próxima requisição protegida, pois o servidor consulta permissões atuais; nenhuma permissão é aceita apenas a partir do cliente ou do JWT.
- Uma conta administradora é um usuário ativo que possui a permissão `access:manage`. A inativação ou remoção dessa permissão da última conta administradora deve ser bloqueada em transação.
- Um usuário só pode alterar a própria senha informando corretamente a senha atual. A alteração é auditada, mas a senha anterior e a nova nunca são armazenadas no log.

### Critérios de aceite

- Dado um usuário ativo com credenciais válidas, quando realizar login, então recebe `200` com token JWT que expira em até 15 minutos e consegue chamar uma rota permitida com sucesso.
- Dado credenciais inválidas, e-mail inexistente ou usuário inativo, quando tentar login, então recebe o mesmo `401` e a mesma mensagem genérica em todos os casos.
- Dado um usuário sem a permissão exigida, quando chamar uma rota protegida, então recebe `403` e nenhuma operação é executada.
- Dado um usuário inativado ou cuja senha foi alterada, quando usar um token emitido antes da alteração, então a próxima rota protegida retorna `401`.
- Dado um usuário que recebeu um papel com uma permissão, quando fizer a próxima requisição protegida que exige essa permissão, então a API aplica a nova autorização sem exigir novo login; o audit log contém ator, ação, entidade, data UTC e `requestId`.
- Dado um usuário autenticado que informa a senha atual correta e uma nova senha entre 12 e 128 caracteres, quando alterar a senha, então a nova senha autentica, a anterior falha e os tokens anteriores retornam `401`.
- Dadas seis tentativas de login falhas com o mesmo IP e e-mail em 15 minutos, quando ocorrer a sexta tentativa, então a API retorna `429`.
- Dada a última conta administradora ativa, quando houver tentativa de inativá-la ou remover `access:manage`, então a operação retorna `422` e a conta mantém a permissão.

### Situações de erro

| Situação | Resposta esperada |
| --- | --- |
| E-mail ou senha ausente/formato inválido | `400` com detalhes de validação seguros |
| Credenciais inválidas, usuário inexistente ou inativo | `401` com a mesma mensagem genérica |
| Token ausente, malformado, expirado ou com versão desatualizada | `401` com código de sessão inválida |
| Usuário autenticado sem permissão | `403` com código de acesso negado |
| E-mail duplicado ao criar/alterar usuário | `409` com código de conflito |
| Senha atual incorreta ou nova senha fora da política | `400` com código de validação de senha |
| Sexta tentativa de login falha no intervalo definido | `429` com `Retry-After` |
| Tentativa de remover `access:manage` da última conta administradora | `422` com código de regra de negócio |

### Fora do escopo do MVP

- Renovação de token, sessões persistidas, revogação administrativa manual e logout com invalidação no servidor.
- Redefinição de senha por e-mail, convites por e-mail e qualquer integração com provedor de e-mail.
- Autenticação multifator (MFA), biometria e chaves de acesso.
- Login social, SSO, SAML, OAuth como provedor de identidade e integração com diretórios corporativos.
- Gestão de organizações/multiempresa e delegação administrativa entre empresas.
- Provisionamento SCIM, gestão de dispositivos, geolocalização, análise de risco e detecção automatizada de fraude.

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
