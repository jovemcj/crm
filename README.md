# CRM — WhatsApp + Instagram + Kanban

CRM completo com integração WhatsApp Web (não oficial via Baileys) e Instagram DM (API privada).

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Node.js + Fastify + Prisma |
| Banco de dados | PostgreSQL |
| Realtime | Socket.io |
| WhatsApp | @whiskeysockets/baileys |
| Instagram | instagram-private-api |
| Frontend | React + Vite + TailwindCSS |
| Kanban | dnd-kit |

## Funcionalidades

- **Kanban** com drag-and-drop entre colunas (pipelines e estágios customizáveis)
- **Contatos** com busca, tags, telefone, email, Instagram
- **Mensagens** em tempo real (WhatsApp + Instagram DM) com chat unificado
- **Dashboard** com métricas de contatos, negócios, conversas e receita
- **Integrações** via página de configurações (QR Code WhatsApp + login Instagram)

## Setup

### 1. Instalar dependências

```bash
cp .env.example .env
# Edite .env com seus dados

npm install
npm install --workspace=backend
npm install --workspace=frontend
```

### 2. Subir banco de dados

```bash
docker-compose up -d
```

### 3. Migrar banco e seed

```bash
cd backend
npx prisma migrate dev --name init
node src/db/seed.js
```

### 4. Rodar o projeto

```bash
# Na raiz
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3333

### Login padrão

```
Email: admin@crm.com
Senha: admin123
```

## Conectar WhatsApp

1. Acesse **Integrações** no menu
2. Clique em **Conectar**
3. Escaneie o QR Code com seu WhatsApp (⋮ → Dispositivos vinculados)

## Conectar Instagram

1. Acesse **Integrações** no menu
2. Clique em **Conectar** e informe usuário/senha
3. Recomendado: use uma conta dedicada/teste

## Aviso Legal

As integrações de WhatsApp e Instagram usam APIs não oficiais. O uso pode resultar em banimento da conta pela Meta. Use por sua conta e risco em ambientes de teste.
