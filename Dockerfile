# ===================================
# Stage 1: Builder - Build TypeScript
#
# Why not Alpine?
# canvas (node-canvas) usually has no prebuilt binary for linux-musl. On Alpine it falls back to building
# from source, and can fail due to toolchain/header differences. Debian (glibc) makes installs much steadier.
# ===================================
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Build deps for native modules (canvas, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libpixman-1-dev \
    libfreetype6-dev \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# Use npm ci when lockfile exists to keep builds reproducible.
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY tsconfig.json ./
COPY src ./src

RUN npm run build && \
    echo "Build OK. Validating path aliases..." && \
    (grep -r "@/" dist/ && echo "Found unresolved path alias '@/' in dist output" && exit 1 || echo "Aliases OK")

# Keep only production dependencies.
RUN npm prune --omit=dev

# ===================================
# Stage 2: Production - Runtime
# ===================================
FROM node:20-bookworm-slim

WORKDIR /app

# Runtime deps for canvas + netcat (docker-entrypoint.sh uses nc)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    libpixman-1-0 \
    libfreetype6 \
    netcat-openbsd \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

COPY tsconfig.json ./
COPY migrations ./migrations
COPY docker-entrypoint.sh /app/docker-entrypoint.sh

RUN chmod +x /app/docker-entrypoint.sh && \
    mkdir -p uploads logs public/question-banks && \
    chown -R node:node /app

USER node

EXPOSE 3006

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3006/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/app.js"]

