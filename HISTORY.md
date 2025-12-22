# Histórico do Projeto GlicoFlow

## Objetivo Principal
Migrar a aplicação de uma planilha local/mock para um deploy real no **Render** utilizando banco de dados **PostgreSQL**.

---

## Log de Conversas e Alterações

### 4. Resolução Definitiva do Erro `ENOENT /dist`
**Problema:** O servidor falhava ao buscar a pasta `dist` mesmo após o build.
**Causas prováveis:**
- Uso de `__dirname` que aponta para a pasta `backend/`, enquanto a `dist` é gerada na raiz.
- Configuração incorreta do "Root Directory" no painel do Render.

**Correções:**
- Refatorado `server.js` para usar `process.cwd()` (ancorado na raiz da execução).
- Adicionado log de listagem de arquivos da raiz no startup para debug visual.

---

## 🛠 Guia de Emergência - Erro de Pasta dist

Se o deploy continuar falhando com "Pasta dist NÃO ENCONTRADA", verifique isto no painel do Render:

### 1. Root Directory (Diretório Raiz)
- **Onde:** Aba "Settings".
- **Valor:** Deve estar **VAZIO**. 
- **Erro Comum:** Se você colocar `backend` ou `src` aqui, o Render não encontrará o `package.json` principal e o build do Vite não funcionará corretamente.

### 2. Build Command
- **Valor Correto:** `npm install && npm run build`
- Verifique se nos logs do Render aparece a mensagem `vite vX.X.X building for production...` e depois `✓ built in X.Xs`. Se isso não aparecer, o build falhou antes de chegar no servidor.

### 3. Start Command
- **Valor Correto:** `npm start`
- Isso executará `node backend/server.js` a partir da raiz, garantindo que `process.cwd()` encontre a pasta `dist/` gerada pelo build.

---

## Estrutura Atual do Backend (`server.js`)
- **Autenticação:** JWT + BCryptJS.
- **Persistência:** PostgreSQL (Pool de conexões).
- **Frontend:** Estático servido pela pasta `/dist`, com redirecionamento Single Page Application (SPA).
