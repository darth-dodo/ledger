# Stage 1: Install dependencies
FROM node:22-alpine AS install
RUN corepack enable pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Stage 2: Production image
FROM node:22-alpine
RUN corepack enable pnpm && npm install -g tsx
WORKDIR /app
COPY --from=install /app/node_modules ./node_modules
COPY src/ ./src/
USER node
EXPOSE 3000
CMD ["tsx", "src/main.ts"]
