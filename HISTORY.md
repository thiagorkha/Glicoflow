# Histórico do Projeto GlicoFlow

## Objetivo Principal
Migrar a aplicação de uma planilha local/mock para um deploy real no **Render** utilizando banco de dados **PostgreSQL**.

---

## Log de Conversas e Alterações

### 5. Correção do Erro `sh: 1: vite: not found`
**Problema:** O comando `npm run build` falhava no Render com o erro "vite: not found".
**Causa:** O Render, com `NODE_ENV=production`, não instala dependências de desenvolvimento (`devDependencies`). Como o Vite é necessário para gerar a pasta `dist` durante o build, ele precisa estar disponível.
**Solução:** Movidas as dependências `vite`, `@vitejs/plugin-react` e `typescript` para a seção `dependencies` no `package.json`.

---

## 🛠 Guia de Deploy no Render (Checklist Final)

Se você encontrar erros no deploy, revise estes pontos:

### 1. Dependências de Build
As ferramentas de build (Vite) agora estão nas dependências principais. Isso garante que o comando `npm run build` funcione mesmo quando o ambiente está configurado como `production`.

### 2. Configurações no Painel do Render (Aba Settings)
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Root Directory:** Deixe em **BRANCO** (vazio).

### 3. Variáveis de Ambiente (Aba Environment)
- `NODE_ENV`: `production`
- `DATABASE_URL`: URL de conexão do seu PostgreSQL.
- `JWT_SECRET`: Uma string aleatória para segurança.

### 4. Diagnóstico de Pasta dist
Se o servidor iniciar mas der erro de "index.html not found", observe os logs de inicialização. O `server.js` agora imprime o conteúdo da raiz do projeto para ajudar a localizar onde a pasta `dist` foi criada.
