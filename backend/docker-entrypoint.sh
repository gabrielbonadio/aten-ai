#!/bin/sh
set -e

echo "[entrypoint] Aguardando banco e executando migrations..."
npx sequelize-cli db:migrate

echo "[entrypoint] Iniciando API..."
exec node dist/server.js
