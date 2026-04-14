# 🤖 GitHub Actions Setup Guide

Você acabou de criar um **CI/CD pipeline completo**! Aqui está o que foi configurado:

## ✅ Workflows Criados

### 1️⃣ **CI/CD Pipeline** (`.github/workflows/ci-cd.yml`)
Executa em cada push e pull request:
- ✅ Build backend e frontend
- ✅ Testes (configurar quando adicionar testes)
- ✅ Lint e formatação
- ✅ Build Docker
- ✅ Verificação de código (SonarCloud)

### 2️⃣ **Dependency Check** (`.github/workflows/dependency-check.yml`)
Executado semanalmente (domingos):
- ✅ Auditoria de segurança
- ✅ Verificação de pacotes desatualizados
- ✅ Notificação de vulnerabilidades

### 3️⃣ **Release** (`.github/workflows/release.yml`)
Executado quando você cria uma tag `v*`:
- ✅ Criar release automaticamente no GitHub
- ✅ Gerar notas de versão

## 🚀 Como Ativar

### Passo 1: Push dos arquivos
```bash
cd fintech-validation-system
git add .github/
git commit -m "ci: add github actions workflows"
git push origin main
```

### Passo 2: Verificar no GitHub
1. Vá para: https://github.com/Kaique-Martins/fintech-validation-system
2. Clique em **Actions** (aba no topo)
3. Veja os workflows em ação!

### Passo 3: Opcional - SonarCloud (Code Quality)
Para análise de código com SonarCloud:

```bash
# 1. Vá para https://sonarcloud.io
# 2. Entre com GitHub
# 3. Importe seu repositório
# 4. Copie o SONARCLOUD_TOKEN
# 5. No GitHub: Settings > Secrets > New repository secret
#    - Name: SONARCLOUD_TOKEN
#    - Value: Cole o token
```

## 📊 Badges para README

Adicione ao seu `README.md` para mostrar status dos workflows:

```markdown
[![CI/CD](https://github.com/Kaique-Martins/fintech-validation-system/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/Kaique-Martins/fintech-validation-system/actions)
[![Dependencies Check](https://github.com/Kaique-Martins/fintech-validation-system/actions/workflows/dependency-check.yml/badge.svg)](https://github.com/Kaique-Martins/fintech-validation-system/actions)
```

## 🏷️ Como Criar uma Release

```bash
# 1. Crie uma tag
git tag -a v1.0.0 -m "Release version 1.0.0"

# 2. Push da tag
git push origin v1.0.0

# 3. GitHub Actions automaticamente cria a release!
# Veja em: Releases na página do repo
```

## 📝 Próximos Passos

Para deixar ainda mais "redondinho":

1. **Adicionar testes**: Configure `npm test` no backend/frontend
   ```bash
   npm install --save-dev jest @testing-library/react
   ```

2. **Configurar ESLint**: Adicione linting ao projeto
   ```bash
   npm install --save-dev eslint prettier
   ```

3. **Branch Protection**: 
   - Vá em Settings > Branches > Add rule
   - Ative "Require status checks to pass"
   - Só merge quando CI passar!

4. **Auto-deploy**: Configure deployment automático (Vercel, Heroku, etc)

## 🔍 Monitorar Status

No GitHub:
- **Actions tab**: Veja todos os workflow runs
- **Settings > Branch Protection**: Configure rules
- **Insights > Actions**: Veja histórico

## 💡 Troubleshooting

Se um workflow falhar:
1. Clique no workflow na aba Actions
2. Veja qual step falhou
3. Verifique os logs
4. Corrija e faça novo push

---

Pronto! Seu projeto está com **automação de classe profissional** 🚀
