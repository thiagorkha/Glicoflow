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

// No Render, o servidor roda em /opt/render/project/src/backend
// A pasta dist deveria estar em /opt/render/project/src/dist
const distPath = path.join(__dirname, '../dist');

console.log('--- DIAGNÓSTICO DE CAMINHOS ---');
console.log('__dirname atual:', __dirname);
console.log('Caminho dist alvo:', distPath);
if (fs.existsSync(distPath)) {
  console.log('✅ Pasta dist encontrada com sucesso.');
} else {
  console.error('❌ ERRO: Pasta dist NÃO ENCONTRADA no caminho:', distPath);
  console.log('Conteúdo do diretório pai:', fs.readdirSync(path.join(__dirname, '..')));
}

const { Pool } = pkg;
const app = express();
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos
app.use(express.static(distPath));

// Configurações de Ambiente
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'glicoflow-secret-fallback-12345';
const PORT = process.env.PORT || 3000;

// Configuração SSL
const needsSSL = DATABASE_URL && (DATABASE_URL.includes('render.com') || DATABASE_URL.includes('aws') || DATABASE_URL.includes('elephantsql'));
const sslConfig = (process.env.NODE_ENV === 'production' || needsSSL) 
  ? { rejectUnauthorized: false } 
  : false;

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: sslConfig
});

pool.on('error', (err) => console.error('Erro no pool do Postgres:', err));

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
    console.log('Banco de dados verificado.');
  } catch (err) {
    console.error('Erro ao inicializar banco:', err.message);
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

// Rotas da API
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const userCheck = await pool.query('SELECT username FROM users WHERE username = $1', [username]);
    if (userCheck.rows.length > 0) return res.status(400).json({ message: 'Usuário já existe' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = randomUUID();
    const result = await pool.query(
      'INSERT INTO users (id, username, email, password_hash, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email',
      [id, username, email, hashedPassword, Date.now()]
    );
    const newUser = result.rows[0];
    const token = jwt.sign({ id: newUser.id, username: newUser.username }, JWT_SECRET);
    res.status(200).set('Content-Type', 'application/json').send(JSON.stringify({ success: true, user: newUser, token }));
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor', details: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(400).json({ message: 'Usuário não encontrado' });
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ message: 'Senha inválida' });
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
    res.status(200).set('Content-Type', 'application/json').send(JSON.stringify({ 
      success: true, 
      user: { id: user.id, username: user.username, email: user.email }, 
      token 
    }));
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email FROM users WHERE id = $1', [req.user.id]);
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.sendStatus(500);
  }
});

app.post('/api/records', authenticateToken, async (req, res) => {
  const { value, date, time } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO glucose_records (id, user_id, value, date, time, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [randomUUID(), req.user.id, value, date, time, Date.now()]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
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
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Redirecionar todas as outras rotas para o index.html do React
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend não encontrado. Verifique o build.');
  }
});

initDb().then(() => {
  app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
});