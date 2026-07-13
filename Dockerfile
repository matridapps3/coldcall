# ---- builder: compile native deps (better-sqlite3 needs python3 + make + g++) ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app/server
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
COPY server/ ./

# ---- runtime: slim image, no build toolchain ----
FROM node:20-bookworm-slim AS runtime
WORKDIR /app/server
ENV NODE_ENV=production \
    PORT=3009 \
    DATA_DIR=/data
COPY --from=builder /app/server ./
RUN mkdir -p /data && chown -R node:node /data /app
USER node
VOLUME ["/data"]
EXPOSE 3009
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3009)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "index.js"]
