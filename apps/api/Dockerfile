# syntax=docker/dockerfile:1
FROM node:24.14.1-bookworm-slim AS dependencies

WORKDIR /workspace
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

FROM dependencies AS build
COPY apps/api apps/api
RUN npm run prisma:generate && npm run build --workspace @erp-next/api

FROM node:24.14.1-bookworm-slim AS production-dependencies

ENV NODE_ENV=production
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --omit=dev --workspace @erp-next/api --include-workspace-root=false \
    && npm cache clean --force

FROM node:24.14.1-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=3001
WORKDIR /workspace
COPY --from=production-dependencies --chown=node:node /workspace/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=node:node /workspace/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /workspace/apps/api/package.json ./apps/api/package.json

USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/v1/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "apps/api/dist/src/main.js"]
