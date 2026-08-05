# Deploy e operação

## Ambientes

Há ambientes local, preview/homologação e produção. Cada ambiente possui variáveis próprias; segredos são fornecidos pelo provedor/CI e nunca entram no repositório.

## Containers

Docker Compose deve iniciar, no mínimo, API, PostgreSQL e Redis para desenvolvimento. Imagens devem usar versões fixadas, usuário não-root quando possível e arquivos `.env.example` sem valores reais.

## CI/CD

Em pull requests, GitHub Actions executa instalação reproduzível, lint, verificação de tipos, testes e build. O deploy só ocorre após sucesso dessas verificações e conforme a política da branch principal.

## Banco de dados

Migrations Prisma são versionadas e aplicadas de forma controlada no pipeline. Produção requer backup testado antes de migrations destrutivas e plano de rollback compatível com a mudança.

## Observabilidade e segurança

Registrar logs estruturados, erros de aplicação e health check. Monitorar disponibilidade, latência e falhas de jobs quando existirem. Rotacionar segredos por meio do provedor, aplicar HTTPS em produção e restringir acesso ao banco e Redis à rede privada.

## Hospedagem

Frontend pode ser implantado na Vercel. API, PostgreSQL e Redis podem usar Railway ou AWS; a escolha concreta, custos, região e estratégia de backup devem ser registrados antes do primeiro deploy de produção.
