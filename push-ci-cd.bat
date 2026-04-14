@echo off
REM Script para fazer push dos arquivos de CI/CD no Windows

echo 🚀 Iniciando push do CI/CD Pipeline...

REM Verificar se estamos no repositório correto
if not exist "docker-compose.yml" (
    echo ❌ Erro: Execute este script da raiz do projeto!
    exit /b 1
)

REM Adicionar arquivos
echo 📝 Adicionando arquivos...
git add .github\

REM Verificar status
git diff --cached --quiet
if %ERRORLEVEL% equ 0 (
    echo ⚠️  Nenhuma mudança para fazer commit
    exit /b 0
)

REM Fazer commit
echo 💾 Committing...
git commit -m "ci: add github actions workflows and contribution guidelines

- Add CI/CD pipeline workflow (build, test, lint, docker)
- Add dependency audit workflow (weekly)
- Add release workflow (automated releases)
- Add CONTRIBUTING guide
- Add PR template
- Add issue templates (bug, feature)
- Add GitHub Actions setup documentation"

REM Push
echo 🔄 Fazendo push...
git push origin main

echo ✅ Push concluído com sucesso!
echo.
echo 📊 Próximos passos:
echo 1. Vá para: https://github.com/Kaique-Martins/fintech-validation-system/actions
echo 2. Veja os workflows em execução
echo 3. Leia: .github/GITHUB_ACTIONS_SETUP.md para mais detalhes
pause
