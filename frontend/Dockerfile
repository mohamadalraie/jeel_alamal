# ── Production image — multi-stage, outputs a minimal standalone server ──

# 1) Install dependencies.
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# 2) Build. NEXT_PUBLIC_* vars are inlined at build time, so the API URL must be
#    available here as a build arg.
FROM node:24-alpine AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3) Runtime — copy only the standalone server, static assets, and public files.
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

USER node
EXPOSE 3000
CMD ["node", "server.js"]
