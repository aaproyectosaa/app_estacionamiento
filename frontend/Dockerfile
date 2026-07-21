FROM node:24-alpine

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY frontend/package.json frontend/

RUN corepack enable && corepack prepare pnpm@latest --activate \
  && pnpm install --frozen-lockfile

COPY frontend/ frontend/

WORKDIR /app/frontend

EXPOSE 5173

CMD ["pnpm", "exec", "vite", "--host", "0.0.0.0"]
