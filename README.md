# 🏦 FinTech Data Quality Validation Engine v2.0

[![CI/CD Pipeline](https://github.com/Kaique-Martins/fintech-validation-system/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/Kaique-Martins/fintech-validation-system/actions/workflows/ci-cd.yml)
[![Dependency Check](https://github.com/Kaique-Martins/fintech-validation-system/actions/workflows/dependency-check.yml/badge.svg)](https://github.com/Kaique-Martins/fintech-validation-system/actions/workflows/dependency-check.yml)
[![Node.js 18+](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Sistema completo (fullstack) para validação autônoma de dados em operações de crédito, compliance e análise de risco de crédito.

## 🎯 Visão Geral

Um **Agente de Validação Autônomo** que implementa:
- ✅ Padronização de dados (cidades, categorias, produtos)
- ✅ Imputação inteligente de categorias
- ✅ Detecção de anomalias de preço (outliers 10x+)
- ✅ Interface ASCII conforme especificação fintech
- ✅ JSON de resposta estruturado

## 📊 Stack Tecnológico

### Backend
- **NestJS** - Framework Node.js moderno para APIs robustas
- **TypeScript** - Tipagem estática para segurança
- **Express** - Server HTTP integrado

### Frontend
- **React 18** - UI moderna e responsiva
- **TypeScript** - Tipagem estrita
- **Vite** - Build rápido e eficiente
- **Axios** - Cliente HTTP

### DevOps
- **Docker** - Containerização
- **Docker Compose** - Orquestração local

## 🚀 Quick Start

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Docker (opcional)

### 1. Backend

```bash
cd backend
npm install
npm run start:dev
```

Backend rodará em `http://localhost:3001`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend rodará em `http://localhost:3000`

## 🐳 Com Docker Compose

```bash
docker-compose up --build
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`

## 📚 API Endpoints

### GET `/api/validation/info`
Obtém informações do serviço

**Response:**
```json
{
  "version": "2.0",
  "name": "FINTECH DATA QUALITY ENGINE",
  "description": "Autonomous validation agent for credit risk analysis and regulatory compliance"
}
```

### POST `/api/validation/validate`
Valida um registro de dados

**Request:**
```json
{
  "produto": "Notebook Dell XPS",
  "categoria": "Eletrônicos",
  "preco": 3500.00,
  "cidade": "São Paulo"
}
```

**Response:**
```json
{
  "dado_corrigido": {
    "produto": "Notebook Dell XPS",
    "categoria": "Eletrônicos",
    "preco": 3500.00,
    "cidade": "São Paulo"
  },
  "status": "APROVADO",
  "motivo": ""
}
```

### GET `/api/validation/interface`
Obtém a interface ASCII

## 🔧 Funcionalidades Principais

### 1. Padronização
- Cidades mapeadas conforme tabela interna brasileira
- Categorias padronizadas conforme taxonomia fintech
- Correção de espaços e formatação

### 2. Imputação
- Inferência automática de categoria baseada no nome do produto
- Busca por palavras-chave configuráveis
- Fallback para "Outros" se não houver match

### 3. Detecção de Anomalias
- Preços 10× acima/abaixo do intervalo típico → **QUARENTENA**
- Valores suspeitos (ex: R$ 0,01 para notebook) → **QUARENTENA**
- Outliers suaves (2-10×) → **APROVADO com aviso**

### 4. Interface Visual
```
╔════════════════════════════════════════════╗
║      FINTECH DATA QUALITY ENGINE v2.0      ║
╠════════════════════════════════════════════╣
║ Status da Análise: [PROCESSANDO]           ║
║ Origem do Dado: Cadastro de Produto        ║
║ Finalidade: Compliance + Score de Crédito  ║
╚════════════════════════════════════════════╝
```

## 📈 Estrutura de Diretórios

```
fintech-validation-system/
├── backend/
│   ├── src/
│   │   ├── validation/
│   │   │   ├── constants/
│   │   │   │   └── references.ts
│   │   │   ├── dto/
│   │   │   │   └── validation.dto.ts
│   │   │   ├── validation.service.ts
│   │   │   ├── validation.controller.ts
│   │   │   └── validation.module.ts
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ValidationForm.tsx
│   │   │   └── ResultDisplay.tsx
│   │   ├── services/
│   │   │   └── validationService.ts
│   │   ├── styles/
│   │   │   ├── index.css
│   │   │   ├── ValidationForm.css
│   │   │   └── ResultDisplay.css
│   │   ├── types/
│   │   │   └── validation.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── Dockerfile
├── docker-compose.yml
└── .gitignore
```

## 🧪 Exemplos de Uso

### Teste 1: Dados Válidos
```json
{
  "produto": "Notebook Dell XPS",
  "categoria": "Eletrônicos",
  "preco": 3500.00,
  "cidade": "São Paulo"
}
```
**Resultado:** ✅ APROVADO (sem alterações)

### Teste 2: Categoria Vazia (Imputação)
```json
{
  "produto": "iPhone 14 Pro",
  "categoria": "",
  "preco": 4200.00,
  "cidade": "RJ"
}
```
**Resultado:** ✅ APROVADO
- Categoria inferida como "Eletrônicos"
- Cidade corrigida para "Rio de Janeiro"

### Teste 3: Preço Suspeito (Quarentena)
```json
{
  "produto": "Notebook Samsung",
  "categoria": "Eletrônicos",
  "preco": 0.01,
  "cidade": "Belo Horizonte"
}
```
**Resultado:** 🚨 QUARENTENA
- Preço incompatível com operações financeiras

## 🔐 Segurança & Compliance

- Tipagem estrita (TypeScript)
- Validação de entrada no backend
- CORS configurado
- Detecção de fraudes por anomalias
- Log estruturado de operações

## 🛠️ Desenvolvimento

### Lint
```bash
# Backend
cd backend && npm run lint

# Frontend
cd frontend && npm run lint
```

### Build Production
```bash
# Backend
cd backend && npm run build

# Frontend
cd frontend && npm run build
```

## 📝 Licença

MIT - Para uso educacional e comercial

## 👥 Time

Engenharia de Dados - Fintech de Crédito

---

**Versão:** 2.0 | **Status:** Production Ready | **Última Atualização:** 2026-04-07
