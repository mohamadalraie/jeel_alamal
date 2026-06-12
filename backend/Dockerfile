# ── Production image — multi-stage for a small, secure runtime ──

# 1) Install ALL deps (incl. dev) needed to compile TypeScript.
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
# Retry guards against a transient esbuild ETXTBSY race on overlay filesystems.
RUN npm ci --no-audit --no-fund || (sleep 3 && npm ci --no-audit --no-fund)

# 2) Build the Nest app to dist/.
FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3) Slim runtime — only production deps + compiled output.
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# SQL migrations are applied at startup by dist/database/run-migrations.js
COPY --from=build /app/drizzle ./drizzle

# Run as the non-root user that the node image ships with.
USER node
EXPOSE 3001
CMD ["node", "dist/main"]
