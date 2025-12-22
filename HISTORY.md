# Histórico do Projeto GlicoFlow

## Objetivo Principal
Migrar a aplicação de uma planilha local/mock para um deploy real no **Render** utilizando banco de dados **PostgreSQL**.

---

## Log de Conversas e Alterações

### 1. Configuração Inicial para Deploy (Render + PostgreSQL)
**Ações:** Criação do backend Express, integração com Postgres e JWT, e adaptação do frontend para consumo de API real.

### 2. Depuração do Erro "Status 200 / Body {}"
**Problema:** O servidor retornava sucesso, mas o conteúdo chegava vazio ao frontend.
**Causas Investigadas:**
- Incompatibilidade de importação do módulo `pg` em ESM.
- Falha na serialização automática do Express (`res.json`).

**Correções Implementadas:**
- **Blindagem de Resposta:** Uso de `JSON.stringify` manual e logs verbosos no backend.
- **Checklist de Ambiente:** Criado guia detalhado para configuração no painel do Render.

---

## 🛠 Checklist Detalhado de Configuração no Render

Para configurar seu serviço no Render (Web Service), siga estes passos na aba **Environment**:

### 1. Configurando NODE_ENV
- **O que fazer:** Clique em "Add Environment Variable".
- **Chave:** `NODE_ENV`
- **Valor:** `production`
- **Por que?** Isso informa ao Express que ele deve rodar em modo de alta performance e avisa ao nosso código (`server.js`) para ativar o **SSL Rejeitar Não Autorizados: false**, necessário para conectar com segurança aos bancos de dados gerenciados do Render.

### 2. Configurando a PORT (Porta)
- **O que fazer:** **Não é necessário criar manualmente.**
- **Como funciona:** O Render injeta automaticamente uma variável chamada `PORT` com um valor dinâmico (ex: 10000).
- **Validação no Código:** Nosso servidor já está configurado com `const PORT = process.env.PORT || 3000;`. 
- **Dica:** Se o Render der erro de "Timed out waiting for port to become available", certifique-se de que o campo "Start Command" no Render está como `npm start`.

### 3. DATABASE_URL (Banco de Dados)
- **O que fazer:** Se você criou o banco de dados no mesmo "Project" do Render, use a **Internal Database URL** (mais rápida e gratuita entre serviços).
- **Chave:** `DATABASE_URL`
- **Valor:** `postgres://usuario:senha@host-interno/banco`

### 4. JWT_SECRET
- **O que fazer:** Crie uma chave de segurança para os tokens dos usuários.
- **Chave:** `JWT_SECRET`
- **Valor:** Digite qualquer frase longa e aleatória (ex: `minha-chave-ultra-secreta-123`).

---

## Estrutura Atual do Backend (`server.js`)
- **Autenticação:** JWT + BCryptJS.
- **Persistência:** PostgreSQL (Pool de conexões).
- **Frontend:** Estático servido pela pasta `/dist`.
