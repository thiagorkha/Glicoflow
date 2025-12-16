# Histórico do Projeto GlicoFlow

## Objetivo Principal
Migrar a aplicação de uma planilha local/mock para um deploy real no **Render** utilizando banco de dados **PostgreSQL**.

---

## Log de Conversas e Alterações

### 1. Configuração Inicial para Deploy (Render + PostgreSQL)
**Contexto:** O usuário solicitou a alteração do app para funcionar no Render com Postgres.
**Ações:**
- Criação do `backend/server.js` (Express, PG, JWT).
- Configuração de tabelas (`users`, `glucose_records`).
- Alteração dos serviços no frontend (`authService`, `dataService`) para consumir a API `/api` ao invés do `mockDatabase`.
- Ajustes no `vite.config.ts` para proxy reverso local.

### 2. Erro: "Register error: Erro desconhecido (200)"
**Problema:** Ao tentar registrar, o frontend recebia status 200 (OK), mas falhava ao processar a resposta (provavelmente JSON inválido ou token ausente).
**Diagnóstico:** O backend estava retornando sucesso, mas o objeto de resposta não chegava corretamente ao frontend.

### 3. Erro: "Erro desconhecido (Status: 200 - Sem token na resposta)" & "Response Body: Object {}"
**Problema:** O servidor enviava Status 200, mas o corpo chegava vazio (`{}`).
**Diagnóstico Profundo:** Identificado conflito na importação do driver `pg` em ambiente Node.js ESM. O uso de `import pg from 'pg'` pode resultar em `Pool` indefinido ou comportamento inesperado dependendo da versão do Node/biblioteca. Além disso, `JSON.stringify` pode retornar `{}` se as chaves forem omitidas.
**Correções Definitivas (Tentativa 3):**
- **backend/server.js:**
  - Alteração para importação robusta: `import pkg from 'pg'; const { Pool } = pkg;`.
  - Adição de logs explícitos do payload JSON antes de enviar para garantir que não está vazio.
- **services/authService.ts:**
  - Adicionado log `[AuthService] Raw Response` para visualizar o texto exato recebido antes do parse.

### 4. Dúvida sobre Segurança (JWT_SECRET)
**Pergunta do Usuário:** "O trecho `const JWT_SECRET = process.env.JWT_SECRET || 'glicoflow-secret-fallback...';` expõe minha senha?"
**Resposta/Ação:**
- Esclarecido que o fallback é apenas para desenvolvimento local. A senha real fica nas variáveis de ambiente do Render.

---

## Estrutura Atual do Backend (`server.js`)
- **Dependências:** Express, CORS, PG (PostgreSQL), BCryptJS, JWT.
- **Autenticação:** JWT (JSON Web Token).
- **Banco de Dados:** Tabelas `users` e `glucose_records`.
- **API Endpoints:**
  - `POST /api/auth/register` (Cria usuário e retorna token)
  - `POST /api/auth/login` (Valida credenciais e retorna token)
  - `GET /api/auth/me` (Valida token persistido)
  - `POST /api/records` (Salva glicemia)
  - `GET /api/records` (Busca histórico)
