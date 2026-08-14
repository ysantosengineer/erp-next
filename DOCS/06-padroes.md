# Padrões de desenvolvimento

## TypeScript e organização

- `strict` deve permanecer habilitado; `any` é proibido salvo justificativa excepcional e localizada.
- Use nomes claros, `camelCase` para variáveis/funções, `PascalCase` para classes/componentes e `kebab-case` para arquivos.
- Um caso de uso deve ter responsabilidade única. Prefira composição a abstrações prematuras.
- Controllers recebem DTOs e retornam DTOs; regras ficam em services/casos de uso.
- Não exponha modelos Prisma, hashes, tokens ou dados internos em respostas.

## Validação, erros e segurança

- Todo input externo é validado no limite da aplicação.
- Erros de domínio são mapeados para o formato de API definido em `05-api.md`.
- Não registrar segredos, senhas, JWTs ou dados pessoais desnecessários em logs.
- Mudanças de estado e ações administrativas relevantes devem gerar auditoria.
- Tokens nunca são persistidos em `localStorage`, logs ou mensagens de erro. Refresh tokens de navegador devem usar cookies `HttpOnly`; access tokens de curta duração permanecem somente em memória quando possível.

## Testes

- Testar regras de negócio com testes unitários, incluindo casos inválidos e transições de estado.
- Testes de integração cobrem endpoints críticos, autorização e persistência quando a infraestrutura existir.
- Corrigir defeitos com teste de regressão quando viável.

## Git e documentação

Commits seguem Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:` e `ci:`. Cada alteração que mude contrato, regra ou decisão deve atualizar o documento correspondente.

## Verificação obrigatória

Após implementação, executar lint, verificação de tipos e testes relacionados. Informar arquivos modificados, decisões e limitações encontradas.
