FROM node:24-alpine

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/

RUN corepack enable && corepack prepare pnpm@latest --activate \
  && pnpm install --frozen-lockfile

COPY backend/prisma backend/prisma
RUN cd backend && pnpm prisma generate

COPY backend/ backend/

WORKDIR /app/backend

EXPOSE 3000

CMD ["sh", "-c", "pnpm prisma db push --skip-generate --accept-data-loss && node prisma/seed.js && node src/index.js"]
