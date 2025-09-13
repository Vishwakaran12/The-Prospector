import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import axios from 'axios';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// SQLite DB setup
let db;
(async () => {
  db = await open({
    filename: './prospector.db',
    driver: sqlite3.Database
  });
  await db.exec(`CREATE TABLE IF NOT EXISTS claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT,
    type TEXT,
    result TEXT,
    user TEXT
  )`);
})();

// Welcome endpoint
app.get('/', (req, res) => {
  res.json({ message: "Welcome to The Prospector Express API! ⛏️ Ready to strike gold?" });
});

// Search endpoint (calls Python aggregate scraper)
app.get('/search/:type', async (req, res) => {
  const { query } = req.query;
  // Use absolute path for Python script
  const scriptPath = __dirname + '/../scraper_service/aggregate_scraper.py';
  const command = `python3 "${scriptPath}" "${query}"`;
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('Scraper error:', error);
      console.error('Scraper stderr:', stderr);
      return res.status(500).json({ error: 'Scraper failed', details: stderr });
    }
    try {
      const results = JSON.parse(stdout);
      res.json(results);
    } catch (e) {
      console.error('Parse error:', e, 'stdout:', stdout);
      res.status(500).json({ error: 'Failed to parse scraper output', details: stdout });
    }
  });
});

// Claims endpoints
app.get('/claims', async (req, res) => {
  const claims = await db.all('SELECT * FROM claims');
  res.json(claims);
});

app.post('/claims', async (req, res) => {
  const { query, type, result, user } = req.body;
  await db.run('INSERT INTO claims (query, type, result, user) VALUES (?, ?, ?, ?)', [query, type, JSON.stringify(result), user || null]);
  res.json({ message: "Claim staked!" });
});

// Edit claim
app.put('/claims/:id', async (req, res) => {
  const { id } = req.params;
  const { query, type, result, user } = req.body;
  await db.run('UPDATE claims SET query=?, type=?, result=?, user=? WHERE id=?', [query, type, JSON.stringify(result), user || null, id]);
  res.json({ message: "Claim updated!" });
});

// Delete claim
app.delete('/claims/:id', async (req, res) => {
  const { id } = req.params;
  await db.run('DELETE FROM claims WHERE id=?', [id]);
  res.json({ message: "Claim deleted!" });
});

// Favorite claim
app.post('/claims/:id/favorite', async (req, res) => {
  // TODO: Add favorite logic (add column if needed)
  res.json({ message: "Claim favorited!" });
});

// Gamification stats
app.get('/stats', async (req, res) => {
  const totalClaims = (await db.get('SELECT COUNT(*) as count FROM claims')).count;
  res.json({ goldFound: totalClaims, claimsStaked: totalClaims });
});

// JWT Auth boilerplate
// app.post('/login', async (req, res) => {
//   // TODO: Implement JWT login
// });
// app.post('/register', async (req, res) => {
//   // TODO: Implement user registration
// });

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Prospector Express backend running on port ${PORT}`);
});
