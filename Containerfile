FROM alpine:edge AS base

RUN apk add --no-cache nodejs npm

RUN npm install -g npm@latest

RUN npm install -g pnpm

FROM base AS prod-deps
WORKDIR /app
COPY package.json ./
ENV CI=true
RUN pnpm install --prod --ignore-scripts

FROM base AS build-deps
WORKDIR /app
COPY package.json ./
ENV CI=true
RUN pnpm install --ignore-scripts

FROM build-deps AS builder
WORKDIR /app
ENV CI=true
COPY --from=build-deps /app/node_modules ./node_modules
COPY --from=build-deps /app/pnpm-lock.yaml ./
COPY . .
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8901
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY package.json ./

EXPOSE 8901
CMD ["node", "node_modules/next/dist/bin/next", "start"]
