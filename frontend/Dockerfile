# =========================
# Dependencias
# =========================
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

# =========================
# Build
# =========================
FROM node:18-alpine AS builder
WORKDIR /app

# 🔴 OBLIGATORIO
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# =========================
# Runtime
# =========================
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]

