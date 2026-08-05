# AGENTS.md

## Projeto

Este repositório contém um ERP moderno para pequenas e médias empresas.

O projeto é desenvolvido como portfólio profissional Full Stack, mas o código
deve seguir padrões compatíveis com uma aplicação comercial real.

## Stack obrigatória

### Frontend

- Node.js
- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- React Hook Form
- Zod

### Backend

- Node.js
- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis
- JWT
- Swagger/OpenAPI

### Infraestrutura

- Docker
- Docker Compose
- GitHub Actions

## Estrutura planejada

- apps/web: frontend em Next.js
- apps/api: backend em NestJS
- packages: pacotes compartilhados
- docs: documentação do projeto

## Instruções obrigatórias

Antes de implementar uma funcionalidade:

1. Leia os documentos relevantes da pasta `docs`.
2. Verifique se já existe uma implementação relacionada.
3. Apresente um plano curto da alteração.
4. Não altere decisões arquiteturais sem justificar.
5. Não adicione dependências sem explicar sua necessidade.

Após implementar:

1. Execute lint.
2. Execute verificação de tipos.
3. Execute os testes relacionados.
4. Informe os arquivos modificados.
5. Resuma as decisões técnicas.
6. Informe erros ou limitações encontrados.

## Qualidade

- Utilize TypeScript com tipagem forte.
- Evite `any`.
- Aplique princípios SOLID quando forem úteis.
- Evite abstrações desnecessárias.
- Utilize nomes claros e descritivos.
- Não misture regras de negócio com controllers.
- Não exponha entidades do banco diretamente pela API.
- Valide todas as entradas externas.
- Escreva testes para regras de negócio relevantes.
- Não armazene segredos ou credenciais no repositório.

## Fonte de verdade

Considere os arquivos da pasta `docs` como a documentação oficial do projeto.

Em caso de conflito:

1. Siga primeiro o `AGENTS.md`.
2. Depois, siga os documentos de arquitetura e requisitos.
3. Aponte o conflito antes de implementar.