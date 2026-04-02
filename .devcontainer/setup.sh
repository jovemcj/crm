#!/bin/bash
set -e

echo "==> Configurando banco de dados..."
sudo service postgresql start
sleep 2

sudo -u postgres psql -c "CREATE USER crm WITH PASSWORD 'crm123' CREATEDB;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE crm OWNER crm;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE crm TO crm;" 2>/dev/null || true

echo "==> Instalando dependências do backend..."
cd /workspaces/crm/backend
cp ../.env.example .env 2>/dev/null || true
npm install

echo "==> Rodando migrations e seed..."
npx prisma migrate deploy 2>/dev/null || npx prisma migrate dev --name init
node src/db/seed.js 2>/dev/null || true

echo "==> Instalando dependências do frontend..."
cd /workspaces/crm/frontend
npm install

echo ""
echo "✅ Setup concluído! Rode: bash /workspaces/crm/start-codespace.sh"
