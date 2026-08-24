# Segurança, hardening e testes E2E

## Modelo de ameaça e decisões

O limite de confiança está na API. O frontend nunca define `companyId`, permissões, atores,
estado, totais ou saldos. A identidade vem do JWT validado e cada consulta de negócio inclui o
tenant. Referências compostas e validações de relacionamento impedem associação entre empresas.

O access token permanece apenas em memória no navegador. O refresh token usa cookie `HttpOnly`,
`SameSite=Lax` por padrão, caminho restrito à autenticação e `Secure` obrigatório em produção. Em
provedores hospedados em sites distintos, `AUTH_COOKIE_SAME_SITE=none` é permitido somente com
`Secure=true`. Nesse modo, refresh e logout também rejeitam `Origin` ausente ou diferente da lista
CORS. O token é armazenado somente como hash, rotacionado a cada uso e revogado no logout. Como as
mutações de negócio usam Bearer token e o cookie só participa da renovação com origem explicitamente
validada, não foi adicionado um segundo token CSRF. Essa decisão deve ser revista se autenticação
por cookie passar a autorizar endpoints de negócio.

## Controles ativos

- validação de ambiente no bootstrap, com segredos JWT distintos de no mínimo 32 caracteres;
- issuer e audience verificados nos access tokens e refresh tokens;
- CORS apenas para `CORS_ORIGINS`, sem curinga quando credenciais estão habilitadas;
- Helmet, remoção de `X-Powered-By`, HSTS em produção e `Cache-Control: no-store`;
- corpos JSON/urlencoded limitados a `REQUEST_BODY_LIMIT` (padrão 256 KiB, máximo 1 MiB);
- `ValidationPipe` com transformação, whitelist e rejeição de campos desconhecidos;
- paginação máxima de 100 e até 100 itens em pedidos/recebimentos;
- rate limit global de 120 requisições/minuto por processo, login 5/15 minutos por IP + hash do
  identificador, refresh 30/15 minutos e comandos críticos 30/minuto;
- erros `5xx` sanitizados, conflitos Prisma conhecidos traduzidos e detalhes internos apenas no log;
- `X-Request-ID` aceito somente em formato seguro ou gerado pela API, propagado na resposta e nos
  logs JSON de conclusão;
- `/api/v1/health` como liveness sem dependências e `/api/v1/ready` como readiness do PostgreSQL;
- Swagger habilitado apenas por `SWAGGER_ENABLED`; o padrão de produção é desabilitado.

O limitador atual é em memória e atende uma única instância. Antes de escalar horizontalmente, o
storage deve ser compartilhado no Redis. Logs não registram corpo, senha, token, cookie, e-mail ou
documentos; `userId` e `companyId` internos são adicionados quando a autenticação termina.

## Banco E2E isolado

Testes HTTP sobem o módulo Nest real e usam PostgreSQL real. `DATABASE_URL_TEST` deve apontar para
um banco cujo nome termine em `_test` ou para um schema cujo nome termine em `_test`. O setup se
recusa a executar fora desse padrão, cria o schema/banco quando permitido, aplica `prisma migrate
deploy` e limpa apenas o schema de teste entre casos. Nunca reutilize `schema=public`.

```powershell
Copy-Item .env.test.example .env.test
$env:DATABASE_URL_TEST='postgresql://usuario:senha@localhost:5432/erp_next?schema=erp_e2e_test'
npm run test:e2e
```

As suítes cobrem autenticação, rotação/revogação, respostas genéricas, `401`/`403`, mass assignment,
paginação/ordenação inválidas, headers, request ID, rate limit, health/readiness, isolamento de
listagem/detalhe/relacionamento/analytics, concorrência de estoque e liquidações financeiras
parciais, totais, idempotentes e acima do saldo. Os testes de integração de domínio complementam
os fluxos de inventário, compras, recebimentos, vendas, reservas e relatórios.

## Checklist antes de produção

- [ ] usar HTTPS em todas as bordas e confirmar HSTS;
- [ ] injetar segredos fortes pelo cofre do provedor e testar rotação;
- [ ] configurar `AUTH_COOKIE_SECURE=true`, origens exatas e Swagger desabilitado;
- [ ] executar `npm ci`, generate, migrations, lint, typecheck, testes, E2E e build;
- [ ] executar auditoria de dependências e revisar cada finding sem `--force` automático;
- [ ] migrar rate limit para Redis antes de múltiplas réplicas;
- [ ] centralizar logs/alertas e definir retenção sem dados sensíveis;
- [ ] validar backup e restauração do PostgreSQL em ambiente não produtivo;
- [ ] monitorar `/health`, `/ready`, latência, taxa de `5xx`, `401`, `403` e `429`;
- [ ] restringir rede e privilégios do banco e executar containers como usuário não-root;
- [ ] definir política de sessão, resposta a incidentes e rollback de migration;
- [ ] realizar pentest focado em autorização horizontal e isolamento multiempresa.

## Limites desta etapa

Redis distribuído, tracing/APM, cofre de segredos gerenciado, backup automatizado, WAF e pentest
externo permanecem pendentes. CI/CD, container da API e configuração de deploy foram adicionados
na Etapa 20; a ativação do ambiente real depende das contas e credenciais dos provedores. A auditoria
de pacotes pode manter findings de ferramentas de desenvolvimento quando não houver correção
compatível sem upgrade principal; eles devem permanecer registrados e acompanhados.

### Auditoria de dependências em 24/08/2026

`npm audit fix` sem `--force` atualizou `@nestjs/swagger`/`js-yaml` e `nanoid`, eliminando três
findings altos. Permanecem três entradas altas que representam a mesma cadeia exclusivamente de
desenvolvimento: `prisma -> @prisma/config -> deepmerge-ts`. O advisory é de exaustão de pilha ao
mesclar grafos recursivos. O npm oferece apenas downgrade forçado do Prisma para 6.12.0, fora da
faixa atual e incompatível com a decisão de não aplicar mudanças potencialmente quebráveis. A API
de runtime usa `@prisma/client`, não importa `@prisma/config` nem processa configurações Prisma
fornecidas por usuários. O finding deve ser reavaliado assim que o Prisma publicar uma versão
compatível com `deepmerge-ts >= 8`.
