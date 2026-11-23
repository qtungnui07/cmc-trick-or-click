import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const storePath = path.join(root, 'data', 'sessions.json');
const app = express();
app.use(express.json({ limit: '1mb' }));
const adminToken = process.env.ADMIN_TOKEN;
const rawAdminPath = (process.env.ADMIN_PATH || '/admin-bb591658d3').trim().replace(/\/+$/, '');
const adminPath = rawAdminPath.startsWith('/') ? rawAdminPath : `/${rawAdminPath}`;

function requireAdmin(req, res, next) {
  if (!adminToken || req.get('x-admin-token') !== adminToken) {
    return res.status(401).json({ error: 'Cần quyền Admin.' });
  }
  next();
}

function readStore() {
  try { return JSON.parse(fs.readFileSync(storePath, 'utf8')); } catch { return { sessions: [] }; }
}
function writeStore(store) {
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
}
function publicSession(session) {
  const { answers, ...safe } = session;
  return safe;
}
function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

app.post('/api/sessions', requireAdmin, (req, res) => {
  const { questions, config } = req.body || {};
  if (!Array.isArray(questions) || !questions.length || !config) return res.status(400).json({ error: 'Thiếu bộ câu hỏi hoặc cấu hình.' });
  const deck = shuffle(questions).slice(0, Math.max(1, Math.min(Number(config.cardsPerRound) || 10, questions.length)));
  const session = {
    id: crypto.randomBytes(6).toString('base64url').toLowerCase(),
    createdAt: new Date().toISOString(), status: 'waiting', playerName: null,
    startedAt: null, completedAt: null, correct: null, wrong: null, durationMs: null,
    deck, config, answers: [],
  };
  const store = readStore(); store.sessions.unshift(session); writeStore(store);
  res.status(201).json(publicSession(session));
});

app.get('/api/sessions', requireAdmin, (_req, res) => {
  const store = readStore();
  res.json(store.sessions.map(publicSession));
});

// Public endpoint for auxiliary monitor screen (leaderboard & participants)
app.get('/api/public-sessions', (_req, res) => {
  const store = readStore();
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.json(store.sessions.map(publicSession));
});

app.get('/api/sessions/:id', (req, res) => {
  const session = readStore().sessions.find((item) => item.id === req.params.id);
  if (!session) return res.status(404).json({ error: 'Lượt chơi không tồn tại hoặc đã bị xóa.' });
  res.json(publicSession(session));
});

app.post('/api/sessions/:id/join', (req, res) => {
  const name = String(req.body?.name || '').trim().slice(0, 60);
  const store = readStore(); const session = store.sessions.find((item) => item.id === req.params.id);
  if (!session) return res.status(404).json({ error: 'Không tìm thấy lượt chơi.' });
  if (session.status === 'completed') return res.status(409).json({ error: 'Lượt này đã hoàn thành.' });
  if (session.playerName || session.status === 'playing') {
    return res.status(409).json({ error: 'Mã QR này đã có người quét và tham gia rồi! Vui lòng nhờ Ban Tổ Chức tạo mã mới.' });
  }
  if (!name) return res.status(400).json({ error: 'Vui lòng nhập tên người chơi.' });
  session.playerName = name; session.status = 'playing'; session.startedAt ||= new Date().toISOString();
  writeStore(store); res.json(publicSession(session));
});

app.post('/api/sessions/:id/complete', (req, res) => {
  const store = readStore(); const session = store.sessions.find((item) => item.id === req.params.id);
  if (!session) return res.status(404).json({ error: 'Không tìm thấy lượt chơi.' });
  const submitted = Array.isArray(req.body?.answers) ? req.body.answers : [];
  const answers = session.deck.map((card) => {
    const answer = submitted.find((item) => String(item.cardId) === String(card.id));
    const choseScam = Boolean(answer?.choseScam);
    return { cardId: card.id, choseScam, isCorrect: choseScam === Boolean(card.isScam) };
  });
  const correct = answers.filter((item) => item.isCorrect).length;
  session.answers = answers; session.correct = correct; session.wrong = answers.length - correct;
  session.status = 'completed'; session.completedAt = new Date().toISOString();
  session.durationMs = session.startedAt ? new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime() : null;
  writeStore(store); res.json(publicSession(session));
});

app.post('/api/sessions/:id/reset', requireAdmin, (req, res) => {
  const store = readStore(); const session = store.sessions.find((item) => item.id === req.params.id);
  if (!session) return res.status(404).json({ error: 'Không tìm thấy lượt chơi.' });
  session.status = 'waiting'; session.playerName = null; session.startedAt = null; session.completedAt = null;
  session.correct = null; session.wrong = null; session.durationMs = null; session.answers = [];
  writeStore(store); res.json(publicSession(session));
});

app.delete('/api/sessions/:id', requireAdmin, (req, res) => {
  const store = readStore(); const index = store.sessions.findIndex((item) => item.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: 'Không tìm thấy lượt chơi.' });
  store.sessions.splice(index, 1); writeStore(store); res.status(204).end();
});

// Explicitly block standard /admin
app.get('/admin', (_req, res) => {
  res.status(404).send('Not Found');
});

// Secret admin route: inject dynamic admin path configuration
app.get(adminPath, (_req, res) => {
  const indexPath = path.join(root, 'dist', 'index.html');
  try {
    let html = fs.readFileSync(indexPath, 'utf8');
    const injection = `<script>window.__ADMIN_PATH__=${JSON.stringify(adminPath)};</script>`;
    html = html.replace('</head>', `${injection}</head>`);
    res.send(html);
  } catch {
    res.sendFile(indexPath);
  }
});

app.use(express.static(path.join(root, 'dist')));
app.get('*', (_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')));
const port = Number(process.env.PORT || 3000);
app.listen(port, '0.0.0.0', () => console.log(`Trick or Click running at http://0.0.0.0:${port} (Admin at ${adminPath})`));
