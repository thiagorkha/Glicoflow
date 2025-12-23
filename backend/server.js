import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const distPath = path.join(process.cwd(), 'dist');

// Serve arquivos estáticos da pasta dist
app.use(express.static(distPath));

// Fallback para qualquer rota carregar o index.html (essencial para SPAs)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor de Produção rodando na porta ${PORT}`);
  console.log(`📂 Servindo arquivos de: ${distPath}`);
});