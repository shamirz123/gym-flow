# ---------- GymFlow API (Express + Prisma) ----------
FROM node:24-slim AS base
# The Prisma migrate engine needs openssl
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# 1) All dependencies + generate the Prisma client
FROM base AS build
COPY package*.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate && npx tsc -p tsconfig.json

# 2) Small production image: runtime packages + compiled JS only
FROM base AS run
ENV NODE_ENV=production
COPY package*.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
RUN mkdir -p uploads && chown -R node:node /app
USER node
EXPOSE 5050
# Run database migrations first, then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
