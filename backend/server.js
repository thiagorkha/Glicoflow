import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Robust PG import for ESM
const { Pool } = pg;

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the React frontend app (dist folder)
app.use(express.static(path.join(__dirname, '../dist')));

// Verificação de segurança da URL do banco
if (!process.env.DATABASE_URL) {
  console.error("ERRO CRÍTICO: DATABASE_URL não está definida nas variáveis de ambiente.");
}

// Conexão com Banco de Dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false 
});

// Testar conexão na inicialização
pool.connect((err, client, release) => {
  if (err) {
    console.error('Erro ao conectar no Banco de Dados:', err);
  } else {
    console.log('Conexão com Banco de Dados estabelecida com sucesso.');
    release();
  }
});

// Inicialização do Banco de Dados (Criação de Tabelas)
const initDb = async () => {
  try {
    // 1. Criar tabelas se não existirem
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at BIGINT
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS glucose_records (
        id UUID PRIMARY KEY,
        user_id UUID REFERENCES users(id),
        value INTEGER NOT NULL,
        date VARCHAR(10) NOT NULL,
        time VARCHAR(5) NOT NULL,
        created_at BIGINT NOT NULL
      );
    `);

    // 2. Migração de segurança: Garantir que created_at é BIGINT (caso tabela tenha sido criada errada antes)
    try {
      await pool.query('ALTER TABLE users ALTER COLUMN created_at TYPE BIGINT');
      console.log('Schema da tabela users verificado.');
    } catch (e) {
      console.log('Nota sobre schema users:', e.message);
    }

    console.log('Banco de dados inicializado corretamente.');
  } catch (err) {
    console.error('Erro fatal ao inicializar tabelas:', err);
  }
};

// Middleware de Autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- ROTAS DE AUTH ---

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  console.log(`API: Tentativa de cadastro para ${username}`);

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
  }

  try {
    // Verificar se usuário existe
    const userCheck = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Este nome de usuário já está em uso.' });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = randomUUID();
    const createdAt = Date.now(); 

    // Criar usuário
    const newUser = await pool.query(
      'INSERT INTO users (id, username, email, password_hash, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email',
      [id, username, email, hashedPassword, createdAt]
    );

    console.log(`API: Usuário cadastrado ID: ${newUser.rows[0].id}`);

    // Gerar Token
    const token = jwt.sign({ id: newUser.rows[0].id, username }, process.env.JWT_SECRET);
    res.json({ success: true, user: newUser.rows[0], token });
  } catch (err) {
    console.error("API: Erro Crítico no Registro:", err);
    // Retorna JSON explícito com o erro
    res.status(500).json({ 
      message: `Erro no banco de dados: ${err.message}`, 
      details: err.detail 
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userResult.rows.length === 0) return res.status(400).json({ message: 'Usuário não encontrado' });

    const user = userResult.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(400).json({ message: 'Senha incorreta' });

    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET);
    
    // Remover hash da resposta
    delete user.password_hash;
    res.json({ success: true, user, token });
  } catch (err) {
    console.error("API: Erro no Login:", err);
    res.status(500).json({ message: err.message || 'Erro interno ao realizar login' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) return res.sendStatus(404);
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

app.post('/api/auth/check-username', async (req, res) => {
  const { username } = req.body;
  try {
    // Verifica conexão antes
    const result = await pool.query('SELECT 1 FROM users WHERE username = $1', [username]);
    res.json({ available: result.rows.length === 0 });
  } catch (err) {
    console.error("API: Erro check-username:", err.message);
    // Retorna erro 500 para que o frontend possa decidir o que fazer (ignorar ou mostrar erro)
    res.status(500).json({ message: 'Erro de conexão com o banco' });
  }
});

// --- ROTAS DE DADOS (Glicemia) ---

app.post('/api/records', authenticateToken, async (req, res) => {
  const { value, date, time } = req.body;
  const userId = req.user.id;
  const id = randomUUID();
  
  try {
    const result = await pool.query(
      'INSERT INTO glucose_records (id, user_id, value, date, time, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [id, userId, value, date, time, Date.now()]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/records', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { startDate, endDate } = req.query;
  
  let query = 'SELECT * FROM glucose_records WHERE user_id = $1';
  const params = [userId];

  if (startDate && endDate) {
    query += ' AND date >= $2 AND date <= $3';
    params.push(startDate, endDate);
  }
  
  query += ' ORDER BY date DESC, time DESC';

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// Endpoint de debug para verificar se a API está de pé
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// All other GET requests not handled before will return the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 3000;
// Inicializa o DB e depois inicia o servidor
initDb().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});