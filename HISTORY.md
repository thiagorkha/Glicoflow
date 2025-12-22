# Histórico do Projeto GlicoFlow

## Objetivo Principal
Migrar a aplicação de uma planilha local/mock para um deploy real no **Render** utilizando banco de dados **PostgreSQL**.

---

## Log de Conversas e Alterações

### 7. Otimização de Chunks (Vite Build)
**Problema:** Aviso `Adjust chunk size limit` durante o deploy no Render.
**Causa:** O bundle principal excedeu 500kb devido às dependências visuais (gráficos e ícones).
**Solução:** Configurado o `vite.config.ts` para realizar *Code Splitting*. Agora, o React, o Recharts e o Lucide-React são gerados em arquivos `.js` separados, o que elimina o aviso e permite que o navegador baixe apenas o que mudou em futuros acessos.

---

## 🛠 Guia de Deploy no Render (Checklist Final)

### 1. Dependências de Build
As ferramentas de build (Vite) agora estão nas dependências principais para garantir funcionamento em `NODE_ENV=production`.

### 2. Conectividade do Banco de Dados
Verifique os logs do **Web Service**. Mensagens de sucesso: `✅ Conexão com PostgreSQL confirmada`.

### 3. Código (Possíveis Falhas Silenciosas)
O código agora evita falhas silenciosas:
- **Check A:** Garante que o frontend está sendo servido da pasta correta através de logs de caminho absoluto.
- **Check B:** Valida se o banco está respondendo a queries básicas no momento do boot.
- **Check C:** Otimização de chunks para evitar avisos de build e melhorar performance.

### 4. Configurações no Painel do Render
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Root Directory:** **VAZIO**.
