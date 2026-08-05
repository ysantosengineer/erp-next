# ERP Next

Monorepo inicial do ERP Next para pequenas e médias empresas. O repositório contém apenas a base técnica: uma aplicação web em Next.js e uma API em NestJS. Módulos de negócio, autenticação e banco de dados ainda não foram implementados.

## Pré-requisitos

- Node.js 24 LTS (consulte `.nvmrc`)
- npm 11 ou superior

## Instalação

```bash
npm install
cp .env.example .env
```

No Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

## Execução

```bash
npm run dev
```

- Web: `http://localhost:3000`
- API: `http://localhost:3001/api/v1/health`

## Scripts

| Comando             | Descrição                                            |
| ------------------- | ---------------------------------------------------- |
| `npm run dev`       | Inicia web e API em modo de desenvolvimento.         |
| `npm run lint`      | Executa ESLint e verifica a formatação com Prettier. |
| `npm run typecheck` | Executa a verificação de tipos dos workspaces.       |
| `npm run test`      | Executa os testes dos workspaces.                    |
| `npm run build`     | Gera builds de produção.                             |
| `npm run format`    | Formata os arquivos com Prettier.                    |

## Estrutura

```text
apps/
  api/  # API NestJS
  web/  # Interface Next.js
DOCS/   # Documentação oficial do projeto
```
