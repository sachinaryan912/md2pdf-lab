# ─────────────────────────────────────────────────────────────────
# Stage 1: Builder
# Install dependencies and compile TypeScript
# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Install required system deps for Puppeteer (Chromium)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji

# Tell Puppeteer to use the system Chromium instead of downloading its own
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Install deps first (separate layer for better cache)
COPY package*.json ./
RUN npm ci --include=dev

# Copy source and compile
COPY tsconfig.json ./
COPY src ./src
COPY public ./public
RUN npm run build

# Prune dev dependencies for production
RUN npm prune --production

# ─────────────────────────────────────────────────────────────────
# Stage 2: Production image
# Copy only built artifacts and production deps
# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

# Same system deps for Puppeteer/Chromium at runtime
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production \
    PORT=8080

WORKDIR /app

# Copy compiled app, production deps, and static frontend from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Run as non-root
USER appuser

# Expose HTTP port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

# Start the server
CMD ["node", "dist/index.js"]
