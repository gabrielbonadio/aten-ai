# syntax=docker/dockerfile:1

# -----------------------------------------------------------------------------
# Stage 1 — dependências
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

# -----------------------------------------------------------------------------
# Stage 2 — build TypeScript
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json ./
COPY src ./src

RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3 — imagem de produção
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm install sequelize-cli --no-save --omit=dev

COPY --from=builder /app/dist ./dist
COPY config ./config
COPY migrations ./migrations
COPY .sequelizerc ./.sequelizerc
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
