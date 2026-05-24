# syntax=docker/dockerfile:1
FROM alpine:edge AS base

RUN apk add --no-cache nodejs npm
RUN npm install -g npm@latest pnpm@11.0.0

# ---- prod deps ---------------------------------------------------------------
FROM base AS prod-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
ENV CI=true
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --prod --frozen-lockfile --ignore-scripts

# ---- builder -----------------------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
ENV CI=true
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts
COPY . .
RUN pnpm build

# ---- runner ------------------------------------------------------------------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8901
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY package.json ./

EXPOSE 8901
CMD ["node", "node_modules/next/dist/bin/next", "start"]
