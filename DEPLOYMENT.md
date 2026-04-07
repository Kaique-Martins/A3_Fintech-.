# 🚀 Deployment Guide - FinTech Validation System

## Pré-requisitos
- Node.js 18+
- npm ou yarn

## Instalação Local

### 1. Clone o repositório
```bash
git clone https://github.com/YOUR_USERNAME/fintech-validation-system.git
cd fintech-validation-system
```

### 2. Backend Setup
```bash
cd backend
npm install
npm run build
npm run start
# Backend será acessível em http://localhost:3001
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run build
# Build estará em dist/
```

## Variáveis de Ambiente

### Backend (.env)
```
NODE_ENV=production
DATABASE_TYPE=json
LOG_LEVEL=info
PORT=3001
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3001
```

## Docker Compose

```bash
docker-compose up -d
```

Acesse em http://localhost:3000

## API Endpoints Principais

### Validation
- `POST /api/validation/validate` - Validar um registro
- `POST /api/validation/batch-validate` - Validar múltiplos registros
- `GET /api/validation/interface` - Interface de validação

### Agent
- `GET /api/agent/config` - Configuração do agente
- `GET /api/agent/metrics` - Métricas
- `GET /api/agent/history/persisted` - Histórico persistido
- `GET /api/agent/history/aggregate` - Agregações
- `POST /api/demo/start` - Iniciar demo contínuo
- `POST /api/demo/stop` - Parar demo

## Features

✅ Validação de dados em tempo real
✅ Agente autônomo com regras customizáveis
✅ Persistência em banco de dados JSON
✅ Histórico centralizado de todas as decisões
✅ Batch import de CSV/JSON
✅ Dashboard integrado
✅ Auto-reprocessing com scheduler
✅ Notificações em tempo real
✅ Learning engine com recomendações

## Status de Produção

- Backend: ✅ Pronto
- Frontend: ✅ Pronto
- Database: ✅ Pronto
- Integração completa: ✅ Testada
