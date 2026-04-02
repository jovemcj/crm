#!/bin/bash
# Script de inicialização do CRM
set -e

echo "🚀 Iniciando CRM..."

# 1. PostgreSQL
if ! pg_isready -q 2>/dev/null; then
  echo "▶ Iniciando PostgreSQL..."
  sudo service postgresql start
  sleep 2
fi
echo "✅ PostgreSQL OK"

# 2. Matar processos anteriores nas portas
fuser -k 3333/tcp 2>/dev/null || true
fuser -k 5173/tcp 2>/dev/null || true
sleep 1

# 3. Backend
echo "▶ Iniciando Backend (porta 3333)..."
cd "$(dirname "$0")/backend"
node src/index.js > /tmp/crm-backend.log 2>&1 &
BACKEND_PID=$!
sleep 3

if ! curl -sf http://localhost:3333/api/health > /dev/null; then
  echo "❌ Backend falhou. Logs:"
  cat /tmp/crm-backend.log
  exit 1
fi
echo "✅ Backend OK (PID $BACKEND_PID)"

# 4. Frontend
echo "▶ Iniciando Frontend (porta 5173)..."
cd "$(dirname "$0")/frontend"
npm run dev -- --host 0.0.0.0 > /tmp/crm-frontend.log 2>&1 &
FRONTEND_PID=$!
sleep 5

if ! curl -sf http://localhost:5173 > /dev/null; then
  echo "❌ Frontend falhou. Logs:"
  cat /tmp/crm-frontend.log
  exit 1
fi
echo "✅ Frontend OK (PID $FRONTEND_PID)"

echo ""
echo "╔════════════════════════════════╗"
echo "║  CRM rodando com sucesso!      ║"
echo "║                                ║"
echo "║  http://localhost:5173         ║"
echo "║                                ║"
echo "║  Login: admin@crm.com          ║"
echo "║  Senha: admin123               ║"
echo "╚════════════════════════════════╝"
