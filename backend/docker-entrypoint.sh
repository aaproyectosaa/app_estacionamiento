#!/bin/sh
set -e

echo "Sincronizando schema..."
pnpm prisma db push --skip-generate --accept-data-loss

if [ "$RUN_SEED" = "true" ]; then
  echo "Ejecutando seed demo..."
  node prisma/seed.js
fi

if [ "$RUN_ADMIN" = "true" ]; then
  echo "Creando usuario admin..."
  node prisma/seed-admin.js
fi

if [ "$RUN_INSPECTORS" = "true" ]; then
  echo "Creando inspectores..."
  node prisma/seed-inspectors.js
fi

exec node src/index.js
