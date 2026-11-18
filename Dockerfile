# ============================================================
# Al Ikhlas Medical — Production Dockerfile
# ============================================================
# Multi-stage build:
#   1. Build the SPA (Vite + prerender)
#   2. Production runtime (Node SSR server)
#
# Usage:
#   docker build -t al-ikhlas-medical .
#   docker run -p 8080:8080 --env-file .env al-ikhlas-medical
# ============================================================

# ── Stage 1: Build ──
FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

RUN npm prune --omit=dev

# ── Stage 2: Runtime ──
FROM node:24-alpine AS runtime

WORKDIR /app

RUN addgroup -S ikhlas && adduser -S ikhlas -G ikhlas

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/api ./api
COPY --from=build /app/config ./config
COPY --from=build /app/vercel.json ./vercel.json
COPY --from=build /app/package.json ./package.json

USER ikhlas

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server/index.js"]
