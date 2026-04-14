# Contributing Guidelines

## 🎯 Como Contribuir

Obrigado por considerar contribuir para o FinTech Validation System! Este documento descreve como fazer isso adequadamente.

## 📋 Pré-requisitos

- Node.js 18+
- npm ou yarn
- Docker (opcional)
- Git

## 🔧 Setup Local

```bash
# Clone o repositório
git clone https://github.com/Kaique-Martins/fintech-validation-system.git
cd fintech-validation-system

# Instale dependências
cd backend && npm install
cd ../frontend && npm install
```

## 🚀 Workflow de Contribuição

### 1. Criar uma Branch
```bash
git checkout -b feat/minha-feature
# ou
git checkout -b fix/bug-correção
```

### 2. Fazer as Mudanças
- Backend: `backend/src/**`
- Frontend: `frontend/src/**`

### 3. Testes
```bash
# Backend
cd backend
npm run test
npm run lint

# Frontend
cd frontend
npm run test
npm run lint
```

### 4. Build Localizado
```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build

# Docker
docker-compose build
```

### 5. Commit com Mensagens Claras
```bash
git commit -m "feat: descrição clara da mudança"
```

Convenção de prefixos:
- `feat:` - Nova feature
- `fix:` - Correção de bug
- `docs:` - Documentação
- `style:` - Formatação
- `refactor:` - Refatoração
- `test:` - Testes
- `chore:` - Manutenção

### 6. Push e Pull Request
```bash
git push origin feat/minha-feature
```

No GitHub, crie um PR descrevendo:
- 🎯 Objetivo
- 🔄 Tipo de mudança (feature/fix/etc)
- ✅ Checklist de testes

## 📊 Padrões de Código

### Backend (NestJS)
- TypeScript strict mode
- Decoradores NestJS
- Repository pattern
- DTOs tipados

### Frontend (React)
- Functional components + Hooks
- TypeScript interfaces
- CSS modules
- Axios para HTTP

## 🧪 Testes

Antes de fazer PR, execute:
```bash
npm test               # Testes
npm run lint          # Linter
npm run build         # Build
```

## 📚 Estrutura do Projeto

```
├── backend/
│   ├── src/
│   │   ├── agent/         # Serviço de validação
│   │   ├── validation/    # Lógica de validação
│   │   ├── database/      # Persistência
│   │   └── notifications/ # Notificações
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── services/      # Serviços HTTP
│   │   └── types/         # Tipos TypeScript
│   └── package.json
└── docker-compose.yml
```

## 🐛 Reportar Bugs

Use o GitHub Issues com:
- Descrição clara
- Passos para reproduzir
- Comportamento esperado vs atual
- Screenshots/logs

## 💭 Sugestões de Features

Abra uma Issue com:
- Descrição clara
- Use cases
- Benefícios
- Possível implementação

## 📖 Documentação

Atualize a documentação para:
- Novas endpoints
- Mudanças de comportamento
- Novos arquivos/pastas importantes
- Variáveis de ambiente

## ✅ Checklist antes do PR

- [ ] Código testado localmente
- [ ] Linter passou (`npm run lint`)
- [ ] Build passou (`npm run build`)
- [ ] Testes passaram (`npm test`)
- [ ] Documentação atualizada
- [ ] Commit messages claras
- [ ] Nada foi quebrado no código existente

## 📞 Dúvidas?

Abra uma Issue com tag `question` ou envie um email para contato.

---

**Agradeço antecipadamente por suas contribuições! 🙏**
