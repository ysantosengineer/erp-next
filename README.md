# ERP Next

Monorepo do ERP Next para pequenas e médias empresas. O repositório contém uma aplicação web em Next.js, uma API NestJS, PostgreSQL via Prisma, autenticação, usuários, papéis e permissões, além dos cadastros iniciais de categorias, unidades de medida e fornecedores. Os demais módulos de negócio permanecem para próximas etapas.

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

Antes de executar o seed local, substitua `SEED_ADMIN_PASSWORD` no seu `.env` por uma senha
exclusiva de desenvolvimento com ao menos 12 caracteres. O seed cria ou atualiza a empresa,
o usuário definido por `SEED_ADMIN_EMAIL`, o papel administrativo e o catálogo inicial de
permissões.

Defina também segredos JWT exclusivos e, para o frontend local, mantenha:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
WEB_ORIGIN=http://localhost:3000
AUTH_COOKIE_SECURE=false
```

Em produção, use HTTPS e `AUTH_COOKIE_SECURE=true`.

## Execução

```bash
npm run dev
```

- Web: `http://localhost:3000`
- API: `http://localhost:3001/api/v1/health`
- Login: `http://localhost:3000/login`
- Usuários: `http://localhost:3000/users`
- Papéis e permissões: `http://localhost:3000/roles`
- Categorias: `http://localhost:3000/categories`
- Unidades de medida: `http://localhost:3000/units`
- Fornecedores: `http://localhost:3000/suppliers`

## Sessão web

O access token é mantido apenas em memória. O refresh token é configurado pela API em cookie `HttpOnly` e rotacionado por `/auth/refresh`; ele não é armazenado pelo frontend. As rotas internas redirecionam para `/login` quando a sessão não pode ser recuperada e a sidebar usa permissões atuais de `/auth/me` apenas para controle visual.

As telas administrativas consomem paginação, filtros e mutações reais da API. O catálogo de permissões é consultado por `GET /api/v1/permissions`; permissões não podem ser criadas, alteradas ou removidas pela interface.

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
