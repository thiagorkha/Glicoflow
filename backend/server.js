import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pkg from 'pg'; // CORREÇÃO: Importação compatível com ESM
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORREÇÃO: Extrair Pool do pacote default
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the React frontend app (dist folder)
app.use(express.static(path.join(__dirname, '../dist')));

// Configurações de Ambiente
if (!process.env.DATABASE_URL) {
  console.error("ERRO CRÍTICO: DATABASE_URL não está definida nas variáveis de ambiente.");
}

// Lógica do JWT
const JWT_SECRET = process.env.JWT_SECRET || 'glicoflow-secret-fallback-12345';
console.log(`Configuração: JWT_SECRET está usando ${process.env.JWT_SECRET ? 'variável de ambiente' : 'valor de fallback'}.`);

// Configuração SSL inteligente
const needsSSL = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com');
const sslConfig = (process.env.NODE_ENV === 'production' || needsSSL) 
  ? { rejectUnauthorized: false } 
  : false;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('ERRO DE CONEXÃO COM BANCO:', err.message);
  } else {
    console.log('Conexão com Banco de Dados estabelecida com sucesso.');
    release();
  }
});

const initDb = async () => {
  try {
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

    try {
      await pool.query('ALTER TABLE users ALTER COLUMN created_at TYPE BIGINT');
    } catch (e) {
      // Ignorar se já estiver correto
    }

    console.log('Tabelas verificadas/criadas.');
  } catch (err) {
    console.error('Erro fatal ao inicializar tabelas:', err);
  }
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- ROTAS DE AUTH ---

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  console.log(`API Register: Iniciando para ${username}`);

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
  }

  try {
    // Verificar duplicidade
    const userCheck = await pool.query('SELECT 1 FROM users WHERE username = $1', [username]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Este nome de usuário já está em uso.' });
    }

    // Inserir
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = randomUUID();
    const createdAt = Date.now(); 

    const newUserResult = await pool.query(
      'INSERT INTO users (id, username, email, password_hash, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email',
      [id, username, email, hashedPassword, createdAt]
    );

    const newUser = newUserResult.rows[0];
    
    // Gerar Token
    console.log("Gerando token...");
    const token = jwt.sign({ id: newUser.id, username: newUser.username }, JWT_SECRET);
    
    if (!token) {
        throw new Error("Falha crítica: Token gerado é nulo.");
    }

    const payload = { 
      success: true, 
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      }, 
      token: String(token) 
    };

    console.log(`API Register: Sucesso. Payload a enviar:`, JSON.stringify(payload));

    res.json(payload);

  } catch (err) {
    console.error("API Register ERROR:", err);
    res.status(500).json({ 
      message: `Erro interno: ${err.message}`, 
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

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
    
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email
    };

    res.json({ success: true, user: userResponse, token });
  } catch (err) {
    console.error("API Login ERROR:", err);
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
    const result = await pool.query('SELECT 1 FROM users WHERE username = $1', [username]);
    res.json({ available: result.rows.length === 0 });
  } catch (err) {
    console.error("API check-username ERROR:", err.message);
    res.status(200).json({ available: true });
  }
});

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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 3000;
initDb().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});