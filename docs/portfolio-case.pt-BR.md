# ERP Next — estudo de caso de engenharia

## Contexto

O ERP Next foi construído como software comercial, não como um conjunto de telas desconectadas. O principal desafio foi fazer controle de acesso, compras, estoque, vendas, financeiro e analytics concordarem sobre a mesma empresa e os mesmos fatos operacionais.

## Desafios e soluções

1. **Isolamento multiempresa:** o contexto autenticado fornece `companyId`; leituras, escritas, relações e unicidade composta são limitadas à empresa.
2. **Consistência de estoque:** quantidades física, reservada e disponível são distintas; movimento e saldo mudam na mesma transação.
3. **Concorrência:** transações, validações de estado e constraints protegem recebimento, inventário, reserva, expedição e baixa.
4. **Repetição de requisições:** chaves de idempotência tornam operações críticas seguras para retry.
5. **Histórico confiável:** itens comerciais guardam snapshots e não dependem apenas do cadastro mutável.
6. **Autorização:** guards NestJS aplicam permissões; o frontend espelha o acesso somente para usabilidade.
7. **Sessão segura:** access tokens curtos e refresh tokens rotativos, armazenados por hash e enviados em cookie seguro.
8. **Rastreabilidade:** registros imutáveis, auditoria, request ID e logs estruturados explicam mudanças importantes.
9. **Entrega confiável:** a CI cobre qualidade estática, unitários, PostgreSQL real, E2E, builds, auditoria e imagem da API.

## Decisões arquiteturais

- O monorepo mantém scripts e quality gates coerentes, embora web e API tenham deploy independente.
- Serviços NestJS modulares concentram workflows e usam Prisma diretamente; um repository genérico apenas duplicaria a ORM neste estágio.
- PostgreSQL é a fonte operacional. O dashboard deriva resultados dos dados persistidos.
- O ledger de estoque é imutável; saldos derivados são atualizados atomicamente com seus movimentos.
- A estratégia multiempresa por linha reduz custo sem esconder as regras de isolamento.
- O Swagger fica disponível localmente e desativado no ambiente público.

## Trade-offs

- Throttling local atende uma instância, mas escala horizontal exige Redis compartilhado.
- Financeiro manual evita inventar regras contábeis, mas pedidos ainda não geram títulos automaticamente.
- O deploy gratuito facilita demonstração, porém possui cold start e cotas.
- Isolamento por linha é econômico; banco por cliente seria fisicamente mais forte e operacionalmente mais caro.
- Ledgers imutáveis favorecem auditoria, mas estornos completos exigem comandos compensatórios adicionais.
- Serviços modulares aceleram o produto; integrações futuras podem justificar portas e adaptadores explícitos.

## Resultado e aprendizados

O resultado é um sistema ponta a ponta com 18 migrations versionadas, cobertura automatizada ampla, CI reproduzível, API em container, health checks públicos e interface autenticada responsiva. Os fluxos demonstram invariantes e tratamento de falhas que um CRUD comum não evidencia.

Estados de domínio restringem transições reais; idempotência e concorrência precisam nascer com o workflow; isolamento deve ser propagado automaticamente e testado de forma negativa; e uma apresentação honesta fica mais forte quando diferencia base implementada de profundidade comercial futura.

## Pitch de 60 segundos

O ERP Next é um ERP multiempresa que desenvolvi com Next.js, NestJS, Prisma e PostgreSQL. Ele conecta compras, estoque físico, reserva e expedição de vendas, financeiro manual e indicadores. O diferencial não é apenas a quantidade de telas: operações críticas são transacionais, o estoque separa físico, reservado e disponível, comandos repetíveis são idempotentes, permissões e empresa são verificadas na API e mutações sensíveis são auditadas. O GitHub Actions valida tudo com PostgreSQL real e coordena a entrega, enquanto Vercel, Render e Neon oferecem uma demonstração pública. Também registrei os trade-offs, sem apresentar recursos fiscais, contábeis ou distribuídos ainda não implementados como concluídos.
