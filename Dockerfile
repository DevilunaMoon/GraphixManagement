# ==============================================================================
# Base image with Node.js and Corepack/pnpm
# ==============================================================================
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# ==============================================================================
# Stage 1: Prune monorepo for the `web` target
# ==============================================================================
FROM base AS pruner
WORKDIR /app
RUN npm install -g turbo@^2.8.12
COPY . .
RUN turbo prune web --docker

# ==============================================================================
# Stage 2: Install dependencies & build
# ==============================================================================
FROM base AS builder
WORKDIR /app

# First copy lockfile and package.json to cache dependencies layer
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source code after dependencies are installed
COPY --from=pruner /app/out/full/ .

# Generate Prisma Client
RUN pnpm --filter database exec prisma generate

# Build Next.js application in standalone mode
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm --filter web build

# ==============================================================================
# Stage 3: Production runner (Lightweight & Secure)
# ==============================================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Install runtime dependencies for Prisma on Alpine Linux
RUN apk add --no-cache openssl libc6-compat

# Security: Non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy static assets and public assets
COPY --from=builder /app/apps/web/public ./apps/web/public

# Copy standalone build output and static folder
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
