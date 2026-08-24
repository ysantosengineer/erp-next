# Requisitos

## Convenções

- Exclusão de registros transacionais deve ser lógica, por inativação ou cancelamento; não física.
- Operações devem respeitar permissões e registrar usuário, data e alterações relevantes.
- Valores monetários são armazenados em unidade menor (centavos) ou `Decimal` no banco; a decisão final é `Decimal(14,2)` no Prisma/PostgreSQL.

## Autenticação e controle de acesso

Usuários e papéis pertencem obrigatoriamente a uma empresa. O contexto da empresa é resolvido a partir do usuário autenticado no banco e nunca é aceito de body, query ou header. Permissões formam um catálogo global; sua atribuição ocorre por papéis limitados à empresa.

### Sessão no navegador

- O access token tem curta duração e é mantido somente em memória no cliente.
- O refresh token é enviado pela API em cookie `HttpOnly`, com `SameSite=Lax`, escopo `/api/v1/auth` e `Secure` obrigatório em produção.
- O cliente envia requisições autenticadas com credenciais de cookie, tenta uma única renovação controlada e nunca persiste tokens em `localStorage`.
- A interface usa permissões retornadas por `GET /auth/me` apenas para experiência de navegação; a API permanece a autoridade de autorização.

### Requisitos funcionais

- Usuários devem autenticar-se com e-mail e senha para acessar recursos protegidos.
- O sistema disponibiliza login, renovação de access token e logout com revogação do refresh token persistido somente como hash.
- Usuários com as permissões específicas de `users.*` podem criar, consultar, editar, inativar e alterar papéis de usuários. Contas não são excluídas fisicamente.
- Usuários com as permissões específicas de `roles.*` podem criar, consultar, editar, excluir papéis sem vínculos e atribuir permissões. Um usuário pode possuir mais de um papel, e um papel pode ser atribuído a vários usuários.
- A gestão administrativa usa as permissões `users.read`, `users.create`, `users.update`, `users.manage_status`, `users.manage_roles`, `roles.read`, `roles.create`, `roles.update`, `roles.delete` e `roles.manage_permissions`.
- Permissões devem ser definidas pelo par **recurso** e **ação** (por exemplo, `users.read` e `sales-orders.confirm`). O catálogo é controlado pelo sistema e somente pode ser consultado pela API; papéis agrupam essas permissões.
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
- Consultas e alterações de usuários, papéis e associações devem sempre incluir a empresa autenticada; recursos pertencentes a outra empresa são tratados como não encontrados.
- Inativar usuário ou alterar seus papéis incrementa `authVersion` e revoga refresh tokens ativos. Uma empresa deve manter ao menos um usuário ativo com `users.manage_roles`.
- O catálogo de permissões é versionado junto ao código e não pode ser criado, editado ou removido pela API. Papéis podem ser mantidos apenas com permissões existentes no catálogo.
- Alterar um papel ou a atribuição de papéis a um usuário afeta a próxima requisição protegida, pois o servidor consulta permissões atuais; nenhuma permissão é aceita apenas a partir do cliente ou do JWT.
- Atribuir papéis durante a criação de usuário exige `users.manage_roles`, além de `users.create`. Atribuir permissões durante a criação de papel exige `roles.manage_permissions`, além de `roles.create`.
- Uma conta administradora é um usuário ativo que possui a permissão `users.manage_roles`. A inativação ou remoção dessa permissão da última conta administradora deve ser bloqueada em transação.
- Um usuário só pode alterar a própria senha informando corretamente a senha atual. A alteração é auditada, mas a senha anterior e a nova nunca são armazenadas no log.

### Critérios de aceite

- Dado um usuário ativo com credenciais válidas, quando realizar login, então recebe `200` com token JWT que expira em até 15 minutos e consegue chamar uma rota permitida com sucesso.
- Dado credenciais inválidas, e-mail inexistente ou usuário inativo, quando tentar login, então recebe o mesmo `401` e a mesma mensagem genérica em todos os casos.
- Dado um usuário sem a permissão exigida, quando chamar uma rota protegida, então recebe `403` e nenhuma operação é executada.
- Dado um usuário inativado ou cuja senha foi alterada, quando usar um token emitido antes da alteração, então a próxima rota protegida retorna `401`.
- Dado um usuário que recebeu um papel com uma permissão, quando fizer a próxima requisição protegida que exige essa permissão, então a API aplica a nova autorização sem exigir novo login; o audit log contém ator, ação, entidade, data UTC e `requestId`.
- Dado um usuário autenticado que informa a senha atual correta e uma nova senha entre 12 e 128 caracteres, quando alterar a senha, então a nova senha autentica, a anterior falha e os tokens anteriores retornam `401`.
- Dadas seis tentativas de login falhas com o mesmo IP e e-mail em 15 minutos, quando ocorrer a sexta tentativa, então a API retorna `429`.
- Dada a última conta administradora ativa, quando houver tentativa de inativá-la ou remover `users.manage_roles`, então a operação retorna `422` e a conta mantém a permissão.
- Dado um usuário autorizado, quando utilizar as telas `/users` e `/roles`, então pesquisa, filtros, paginação, formulários e ações refletem as permissões de `/auth/me`, enquanto a API valida novamente cada operação.

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
| Tentativa de remover `users.manage_roles` da última conta administradora | `422` com código de regra de negócio |

### Fora do escopo do MVP

- Revogação administrativa seletiva de sessões e gerenciamento de dispositivos autenticados.
- Redefinição de senha por e-mail, convites por e-mail e qualquer integração com provedor de e-mail.
- Autenticação multifator (MFA), biometria e chaves de acesso.
- Login social, SSO, SAML, OAuth como provedor de identidade e integração com diretórios corporativos.
- Gestão de organizações/multiempresa e delegação administrativa entre empresas.
- Provisionamento SCIM, gestão de dispositivos, geolocalização, análise de risco e detecção automatizada de fraude.

## Cadastros

- Clientes pertencem a uma empresa, podem ser pessoa física ou jurídica e possuem nome/razão social, CPF/CNPJ obrigatório e único por empresa, contatos opcionais, um endereço principal opcional, limite de crédito não negativo em `Decimal(14,2)` e status. Documento, telefone e CEP são persistidos somente com dígitos; valores monetários trafegam como strings decimais para preservar precisão.
- Fornecedores pertencem a uma empresa, podem ser pessoa física ou jurídica e possuem nome/razão social, CPF/CNPJ obrigatório e único por empresa, contatos opcionais, um endereço principal opcional e status. CPF/CNPJ, telefone e CEP são persistidos somente com dígitos; fornecedores inativos continuam consultáveis e preservados para históricos, mas futuramente não serão oferecidos por padrão em novas compras.
- Produtos pertencem a uma empresa e possuem nome, SKU obrigatório e único por empresa, código de barras numérico opcional e único por empresa, categoria e unidade obrigatórias, fornecedor principal opcional, preços de custo e venda, peso, dimensões, estoque mínimo e status.
- O SKU é persistido sem espaços e em maiúsculas. Código de barras aceita de 8 a 14 dígitos sem validação de checksum. Preços e quantidades são transportados como strings decimais para preservar precisão.
- Categorias, unidades e fornecedores precisam estar ativos para novas associações. Um produto existente pode manter uma associação posteriormente inativada até que o usuário escolha substituí-la.
- NCM, imagens, estoque atual, variações, lotes e movimentações não fazem parte desta etapa de catálogo e serão tratados em módulos posteriores.
- Categorias organizam produtos e não podem ser removidas enquanto tiverem produtos ativos.
- Depósitos pertencem a uma empresa, têm nome, código único por empresa, descrição e status. Um depósito só pode ser inativado depois de todos os seus endereços ativos serem inativados.
- Endereços de estoque pertencem simultaneamente à empresa e a um depósito, usam código único por depósito e podem informar zona, corredor, prateleira, nível, posição e capacidade lógica não negativa. Novos endereços e reativações exigem depósito ativo.
- O cadastro de depósitos e endereços não altera saldos. Saldos e movimentações são mantidos pelo módulo transacional de estoque.
- Armazéns possuem nome e endereço opcional.

## Operações

### Estoque

- O saldo atual é mantido por empresa, produto e endereço físico em `Decimal(18,4)` e nunca pode ficar negativo. Linhas com saldo zero são preservadas.
- Entradas, saídas, ajustes de entrada/saída e transferências exigem produto, depósito e endereço ativos da empresa autenticada. Quantidades trafegam como strings decimais positivas.
- Cada comando atualiza saldo, cria uma movimentação imutável e registra auditoria na mesma transação serializável. Saídas e transferências usam decremento condicional para impedir saldo negativo sob concorrência.
- Transferências registram uma única movimentação com origem e destino distintos; podem atravessar depósitos da mesma empresa.
- Uma chave de idempotência opcional é única por empresa. Repetir exatamente o mesmo comando devolve a movimentação existente; reutilizá-la com outro conteúdo retorna conflito.
- As permissões são `inventory.read`, `inventory.entry`, `inventory.exit`, `inventory.adjust`, `inventory.transfer` e `inventory.movements.read`.
- Inventários físicos pertencem a uma empresa e a um depósito. Ao iniciar, o sistema captura um snapshot imutável dos saldos registrados, bloqueia movimentações no depósito e permite primeira contagem e recontagem com quantidades `Decimal(18,4)` não negativas.
- Qualquer diferença exige recontagem. A quantidade final é a primeira contagem quando não há divergência e a recontagem quando existe. Nenhuma fase anterior à aprovação altera o saldo.
- A aprovação exige todas as contagens concluídas, ocorre em transação serializável e reutiliza os ajustes `ADJUSTMENT_IN`/`ADJUSTMENT_OUT`, identificados por `referenceType=INVENTORY`. Cancelamento preserva o histórico e não gera ajustes.
- As permissões específicas são `inventory_counts.read`, `inventory_counts.create`, `inventory_counts.count`, `inventory_counts.recount`, `inventory_counts.approve` e `inventory_counts.cancel`.
- Reservas, lotes, números de série, compras e vendas integradas permanecem fora desta etapa.

### Pedidos de compra

- Pedidos de compra pertencem a uma empresa, exigem fornecedor e depósito de destino ativos e contêm ao menos um produto ativo. Recursos externos à empresa são tratados como não encontrados.
- O número `PO-000001` é gerado por contador atômico por empresa. Itens congelam nome, SKU e símbolo da unidade; quantidade usa `Decimal(18,4)` e custos/totais usam `Decimal(14,2)`.
- O backend calcula subtotal por item, subtotal do pedido e `total = subtotal - desconto + frete + outros`. Desconto é financeiro e aplicado somente ao pedido.
- O fluxo é `DRAFT → PENDING_APPROVAL → APPROVED`; rascunhos, pendentes e aprovados podem ser cancelados com motivo. Somente rascunhos são editáveis e cancelados não reabrem.
- Aprovar pedido registra usuário/data, mas não altera `InventoryBalance`, não cria `StockMovement` e não atualiza o custo do produto. Recebimentos parciais e totais pertencem à etapa seguinte.
- As permissões são `purchase_orders.read`, `create`, `update`, `submit`, `approve` e `cancel`.

### Recebimentos de compras

- Somente pedidos `APPROVED` ou `PARTIALLY_RECEIVED` podem ser recebidos. Cada confirmação é imutável, vinculada ao pedido e numerada como `PR-000001` por contador atômico da empresa.
- O backend calcula a quantidade pendente, impede excesso e permite múltiplos recebimentos parciais. Cada item usa uma localização ativa do depósito do pedido; depósito/localização inativos ou bloqueados por inventário impedem a operação.
- Histórico (`PurchaseReceiptItem`) e acumulado (`PurchaseOrderItem.receivedQuantity`) são atualizados juntamente com `InventoryBalance`, `StockMovement` de entrada e status do pedido em uma transação `SERIALIZABLE` com rollback total.
- A chave de idempotência é obrigatória por empresa. Repetir o mesmo payload devolve o recebimento existente; reutilizar a chave com conteúdo diferente retorna conflito.
- Produto ou fornecedor inativados depois da aprovação não invalidam o compromisso existente. Custo do produto, financeiro, fiscal, estorno e recebimento avulso não são alterados nesta etapa.
- As permissões são `purchase_receipts.read` e `purchase_receipts.create`.

### Pedidos de venda

- Pedidos de venda pertencem à empresa, exigem cliente, depósito de origem e ao menos um produto ativo do tenant. O número `SO-000001` é gerado por contador atômico por empresa.
- Itens congelam nome, SKU e símbolo da unidade. Quantidades e preparação de reserva usam `Decimal(18,4)`; preços, descontos e totais usam `Decimal(14,2)` e trafegam como strings.
- O subtotal do item é o valor bruto arredondado menos o desconto da linha. O subtotal do pedido soma os itens líquidos; `total = subtotal - desconto geral + frete + outros`. O backend é a autoridade dos cálculos.
- O fluxo desta etapa é `DRAFT → CONFIRMED` e `DRAFT|CONFIRMED → CANCELLED`. Somente rascunhos são editáveis; confirmação e cancelamento registram ator/data e estados finais preservam o histórico.
- Cliente, depósito e produtos precisam estar ativos para criar, editar ou confirmar. O limite de crédito é apenas informativo porque ainda não existe saldo de contas a receber.
- Confirmar ou cancelar pedido de venda não consulta saldo como condição, não altera `InventoryBalance`, não cria `StockMovement` e não cria reserva. `reservedQuantity` permanece zero como preparação estrutural para a Etapa 16.
- As permissões são `sales_orders.read`, `create`, `update`, `confirm` e `cancel`.
- Compras possuem fornecedor, depósito, itens e custos congelados, totais, aprovação e recebimentos parciais ou totais rastreáveis. Receber compra gera entrada de estoque.

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
