#!/bin/bash
# Inicia o CRM no GitHub Codespaces
set -e

ROOT="/workspaces/crm"

# PostgreSQL
if ! pg_isready -q 2>/dev/null; then
  sudo service postgresql start
  sleep 2
fi

# Matar portas ocupadas
fuser -k 3333/tcp 2>/dev/null || true
fuser -k 5173/tcp 2>/dev/null || true
sleep 1

# Backend
echo "▶ Iniciando Backend..."
cd "$ROOT/backend"
export DATABASE_URL="postgresql://crm:crm123@localhost:5432/crm"
node src/index.js > /tmp/crm-backend.log 2>&1 &

sleep 3
curl -sf http://localhost:3333/api/health > /dev/null && echo "✅ Backend OK" || (echo "❌ Backend falhou:" && cat /tmp/crm-backend.log && exit 1)

# Frontend — usa a URL pública do Codespace para o proxy da API
BACKEND_URL="http://localhost:3333"
if [ -n "$CODESPACE_NAME" ]; then
  BACKEND_URL="https://${CODESPACE_NAME}-3333.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
fi

echo "▶ Iniciando Frontend..."
cd "$ROOT/frontend"
VITE_API_URL="$BACKEND_URL" VITE_WS_URL="$BACKEND_URL" \
  npm run dev -- --host 0.0.0.0 > /tmp/crm-frontend.log 2>&1 &

sleep 5
curl -sf http://localhost:5173 > /dev/null && echo "✅ Frontend OK" || (echo "❌ Frontend falhou:" && cat /tmp/crm-frontend.log && exit 1)

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  CRM rodando!                            ║"
echo "║  Acesse a aba PORTS → porta 5173         ║"
echo "║                                          ║"
echo "║  Login: admin@crm.com  |  Senha: admin123║"
echo "╚══════════════════════════════════════════╝"
