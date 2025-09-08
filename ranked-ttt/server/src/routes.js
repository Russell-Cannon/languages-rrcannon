import express from 'express';
import { pool } from './db.js';
import { updateElo } from './elo.js';


export const router = express.Router();


// Register or fetch a player by name
router.post('/players', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || name.length > 32) return res.status(400).json({ error: 'Name 1-32 chars required.' });
    const upsert = `
      INSERT INTO players(name) VALUES($1)
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, name, rating, created_at`;
    const { rows: [player] } = await pool.query(upsert, [name]);
    res.json(player);
  } catch (e) { next(e); }
});

// Leaderboard (top N)
router.get('/leaderboard', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '10', 10), 100);
    const { rows } = await pool.query('SELECT id, name, rating FROM players ORDER BY rating DESC LIMIT $1', [limit]);
    res.json(rows);
  } catch (e) { next(e); }
});

// Report a finished game with move list; updates ratings atomically
router.post('/games', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { playerX, playerO, moves, winner } = req.body;
    if (!playerX || !playerO || !Array.isArray(moves)) return res.status(400).json({ error: 'Invalid payload.' });

    await client.query('BEGIN');
    const { rows: [px] } = await client.query('SELECT id, rating FROM players WHERE id = $1', [playerX]);
    const { rows: [po] } = await client.query('SELECT id, rating FROM players WHERE id = $1', [playerO]);
    if (!px || !po) throw new Error('Players not found');

    let scoreX = 0.5; // draw default
    if (winner === px.id) scoreX = 1; else if (winner === po.id) scoreX = 0;

    const [newRX, newRO, deltaX] = updateElo(px.rating, po.rating, scoreX);

    await client.query('UPDATE players SET rating = $1 WHERE id = $2', [newRX, px.id]);
    await client.query('UPDATE players SET rating = $1 WHERE id = $2', [newRO, po.id]);

    const isDraw = winner ? false : true;

    const insertGame = `
      INSERT INTO games(player_x, player_o, winner, is_draw, moves, rating_delta)
      VALUES($1,$2,$3,$4,$5,$6)
      RETURNING *`;
    const { rows: [game] } = await client.query(insertGame, [px.id, po.id, winner || null, isDraw, JSON.stringify(moves), deltaX]);

    await client.query('COMMIT');
    res.json({ game, ratings: { [px.id]: newRX, [po.id]: newRO } });
  } catch (e) {
    await (async () => { try { await client.query('ROLLBACK'); } catch {} })();
    next(e);
  } finally {
    client.release();
  }
});

// Simple opponent suggestion near rating
router.get('/match', async (req, res, next) => {
  try {
    const { playerId } = req.query;
    const { rows: [me] } = await pool.query('SELECT id, rating FROM players WHERE id = $1', [playerId]);
    if (!me) return res.status(404).json({ error: 'Player not found' });
    const { rows } = await pool.query(`
      SELECT id, name, rating
      FROM players
      WHERE id <> $1
      ORDER BY ABS(rating - $2) ASC
      LIMIT 1`, [playerId, me.rating]);
    res.json(rows[0] || null);
  } catch (e) { next(e); }
});