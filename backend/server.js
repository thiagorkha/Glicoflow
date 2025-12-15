// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// Conexão com Banco de Dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Necessário para Render
});

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
  try {
    // Verificar se usuário existe
    const userCheck = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userCheck.rows.length > 0) return res.status(400).json({ message: 'Usuário já existe' });

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = require('crypto').randomUUID();

    // Criar usuário
    const newUser = await pool.query(
      'INSERT INTO users (id, username, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, username, email',
      [id, username, email, hashedPassword]
    );

    // Gerar Token
    const token = jwt.sign({ id: newUser.rows[0].id, username }, process.env.JWT_SECRET);
    res.json({ success: true, user: newUser.rows[0], token });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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

app.post('/api/auth/check-username', async (req, res) => {
  const { username } = req.body;
  const result = await pool.query('SELECT 1 FROM users WHERE username = $1', [username]);
  res.json({ available: result.rows.length === 0 });
});

// --- ROTAS DE DADOS (Glicemia) ---

app.post('/api/records', authenticateToken, async (req, res) => {
  const { value, date, time } = req.body;
  const userId = req.user.id;
  const id = require('crypto').randomUUID();
  
  try {
    const result = await pool.query(
      'INSERT INTO glucose_records (id, user_id, value, date, time, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [id, userId, value, date, time, Date.now()]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
