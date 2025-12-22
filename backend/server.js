
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pkg from 'pg'; 
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = process.cwd();
const distPath = path.join(rootDir, 'dist');

const { Pool } = pkg;
const app = express();

// --- CONFIGURAÇÕES BÁSICAS ---
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'glicoflow-super-secret-key';
const PORT = process.env.PORT || 3000;

// Configuração SSL para o Render
const sslConfig = (process.env.NODE_ENV === 'production' || (DATABASE_URL && DATABASE_URL.includes('render.com'))) 
  ? { rejectUnauthorized: false } 
  : false;

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: sslConfig
});

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// Logger de Depuração
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.method === 'POST') console.log('Body:', req.body);
  next();
});

// --- INICIALIZAÇÃO DO BANCO ---
const initDb = async () => {
  try {
    const test = await pool.query('SELECT NOW()');
    console.log('✅ Banco de dados conectado:', test.rows[0].now);

    // Tabela de Usuários
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at BIGINT NOT NULL
      );
    `);

    // Tabela de Registros
    await pool.query(`
      CREATE TABLE IF NOT EXISTS glucose_records (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        value INTEGER NOT NULL,
        date VARCHAR(10) NOT NULL,
        time VARCHAR(5) NOT NULL,
        created_at BIGINT NOT NULL
      );
    `);
    console.log('✅ Tabelas verificadas/criadas com sucesso.');
  } catch (err) {
    console.error('❌ ERRO AO INICIALIZAR BANCO:', err.message);
  }
};

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Token não fornecido' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Token inválido ou expirado' });
    req.user = user;
    next();
  });
};

// --- ROTAS DA API ---

// Health Check
app.get('/api/health', (req, res) => res.json({ status: 'ok', database: !!DATABASE_URL }));

// Verificar usuário
app.post('/api/auth/check-username', async (req, res) => {
  const { username } = req.body;
  try {
    const result = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    res.json({ success: true, available: result.rows.length === 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erro na verificação' });
  }
});

// Registro
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: 'Dados incompletos' });
  }

  try {
    const userCheck = await pool.query('SELECT id FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Usuário ou E-mail já existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = randomUUID();
    
    await pool.query(
      'INSERT INTO users (id, username, email, password_hash, created_at) VALUES ($1, $2, $3, $4, $5)',
      [userId, username, email, hashedPassword, Date.now()]
    );

    const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '7d' });
    
    console.log(`👤 Usuário criado: ${username}`);
    return res.status(200).json({ 
      success: true, 
      token, 
      user: { id: userId, username, email } 
    });
  } catch (err) {
    console.error('Erro no registro:', err);
    return res.status(500).json({ success: false, message: 'Erro interno', error: err.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Usuário não encontrado' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Senha incorreta' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    
    return res.json({ 
      success: true, 
      token, 
      user: { id: user.id, username: user.username, email: user.email } 
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
});

// Me
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email FROM users WHERE id = $1', [req.user.id]);
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erro de sessão' });
  }
});

// Records
app.post('/api/records', authenticateToken, async (req, res) => {
  const { value, date, time } = req.body;
  try {
    const recordId = randomUUID();
    const result = await pool.query(
      'INSERT INTO glucose_records (id, user_id, value, date, time, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [recordId, req.user.id, value, date, time, Date.now()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erro ao salvar dado' });
  }
});

app.get('/api/records', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM glucose_records WHERE user_id = $1 ORDER BY date DESC, time DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erro ao listar dados' });
  }
});

// --- SERVIR FRONTEND (DEVE SER A ÚLTIMA COISA) ---
app.use(express.static(distPath));

app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Aguardando build final... recarregue em instantes.');
  }
});

// Inicializar e Rodar
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
  });
});
