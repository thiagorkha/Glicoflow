# Histórico do Projeto GlicoFlow

## Objetivo Principal
Migrar a aplicação de uma planilha local/mock para um deploy real no **Render** utilizando banco de dados **PostgreSQL**.

---

## Log de Conversas e Alterações

### 3. Correção do Erro `ENOENT` (Pasta `dist` não encontrada)
**Problema:** No deploy, o servidor iniciava mas falhava ao tentar servir o `index.html`, pois a pasta `dist` não existia ou o caminho estava incorreto.
**Ações:**
- Simplificação do comando de build no `package.json` para garantir a geração da pasta.
- Adição de diagnóstico de caminhos no `server.js` para mostrar exatamente onde o servidor está procurando os arquivos.
- Adição de verificação `fs.existsSync` para evitar crash silencioso.

---

## 🛠 Guia Definitivo de Deploy no Render

Se você está vendo erros de "file not found", verifique estas configurações no painel do Render:

### 1. Comandos de Build e Start
No campo **Settings** do seu Web Service:
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start` (ou `node backend/server.js`)

### 2. Variáveis de Ambiente (Aba Environment)
- `NODE_ENV`: `production`
- `DATABASE_URL`: Use a **Internal Database URL** do seu banco Render.
- `JWT_SECRET`: Uma senha forte para os tokens.

### 3. Por que o erro `ENOENT` acontece?
1. O comando `npm run build` não foi executado (o Render precisa dele para criar a pasta `dist`).
2. O comando de build falhou (verifique os logs de build anteriores ao erro de runtime).
3. O caminho relativo no `server.js` está errado (corrigido agora com logs de diagnóstico).

---

## Estrutura Atual do Backend (`server.js`)
- **Autenticação:** JWT + BCryptJS.
- **Persistência:** PostgreSQL (Pool de conexões).
- **Frontend:** Estático servido pela pasta `/dist`, com redirecionamento Single Page Application (SPA).
