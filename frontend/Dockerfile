# syntax=docker/dockerfile:1

# -----------------------------------------------------------------------------
# Stage 1 — dependências
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

# -----------------------------------------------------------------------------
# Stage 2 — build Angular (produção)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

ARG API_URL=http://localhost:3000

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json angular.json tsconfig.json tsconfig.app.json ./
COPY tailwind.config.js postcss.config.js ./
COPY src ./src
COPY scripts ./scripts

RUN API_URL="${API_URL}" node -e "\
  const fs = require('fs'); \
  const path = 'src/environments/environment.production.ts'; \
  const url = process.env.API_URL || 'http://localhost:3000'; \
  const content = fs.readFileSync(path, 'utf8').replace('__API_URL__', url.replace(/'/g, \"\\\\'\")); \
  fs.writeFileSync(path, content); \
  console.log('[docker] environment.production.ts apiUrl =', url); \
" \
  && npm run build -- --configuration production

# -----------------------------------------------------------------------------
# Stage 3 — Nginx (arquivos estáticos)
# -----------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/aten-ai-portal/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
