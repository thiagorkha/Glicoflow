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

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// Logger para depuração no Render (Essencial para resolver o erro 200:{})
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Servir arquivos estáticos
app.use(express.static(distPath));

// Configurações
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'glicoflow-super-secret-key';
const PORT = process.env.PORT || 3000;

const sslConfig = (process.env.NODE_ENV === 'production' || (DATABASE_URL && DATABASE_URL.includes('render.com'))) 
  ? { rejectUnauthorized: false } 
  : false;

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: sslConfig
});

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
    console.log('✅ Tabelas verificadas/criadas.');
  } catch (err) {
    console.error('❌ ERRO CRÍTICO NO BANCO:', err.message);
  }
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token não fornecido' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token inválido ou expirado' });
    req.user = user;
    next();
  });
};

// --- ROTAS DA API ---

// Rota de verificação de disponibilidade (estava faltando)
app.post('/api/auth/check-username', async (req, res) => {
  const { username } = req.body;
  try {
    const result = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    res.json({ available: result.rows.length === 0 });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao verificar usuário' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    // 1. Verificar duplicidade
    const userCheck = await pool.query('SELECT id FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Usuário ou E-mail já cadastrado' });
    }

    // 2. Criar usuário
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = randomUUID();
    const createdAt = Date.now();

    await pool.query(
      'INSERT INTO users (id, username, email, password_hash, created_at) VALUES ($1, $2, $3, $4, $5)',
      [userId, username, email, hashedPassword, createdAt]
    );

    // 3. Gerar Token imediatamente
    const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '7d' });
    
    console.log(`✅ Novo usuário registrado: ${username}`);
    res.status(200).json({ 
      success: true, 
      token, 
      user: { id: userId, username, email } 
    });
  } catch (err) {
    console.error('Erro no registro:', err);
    res.status(500).json({ success: false, message: 'Erro interno ao registrar', error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ 
      success: true, 
      token, 
      user: { id: user.id, username: user.username, email: user.email } 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erro no servidor' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Usuário não encontrado' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar perfil' });
  }
});

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
    res.status(500).json({ message: 'Erro ao salvar registro', error: err.message });
  }
});

app.get('/api/records', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM glucose_records WHERE user_id = $1 ORDER BY date DESC, time DESC LIMIT 100',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar registros' });
  }
});

// Redirecionamento SPA (Manter no final)
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Aplicação não encontrada. Verifique o build.');
  }
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor GlicoFlow ativo na porta ${PORT}`);
    console.log(`📁 Servindo frontend de: ${distPath}`);
  });
});