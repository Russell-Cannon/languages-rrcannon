import express from "express";
import morgan from "morgan";
import cors from "cors";
import pkg from "pg";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(process.cwd(), "public");
app.use(express.static(publicDir));
app.get("/", (req, res) => res.sendFile(path.join(publicDir, "index.html")));

async function initDb() {
  await pool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS players (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT UNIQUE NOT NULL,
      rating INT NOT NULL DEFAULT 1000,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS games (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_x UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      player_o UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      winner UUID NULL REFERENCES players(id),
      is_draw BOOLEAN NOT NULL DEFAULT FALSE,
      moves JSONB NOT NULL,
      rating_delta INT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

function ex(a, b) { return 1 / (1 + Math.pow(10, (b - a) / 400)); }
function updateElo(rA, rB, scoreA, k = 32) {
  const na = Math.round(rA + k * (scoreA - ex(rA, rB)));
  const nb = Math.round(rB + k * ((1 - scoreA) - ex(rB, rA)));
  return { newA: na, newB: nb, deltaA: na - rA };
}

app.post("/api/players", async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || name.length > 32) return res.status(400).json({ error: "Name 1-32 chars required" });
    const upsert = `
      INSERT INTO players(name) VALUES($1)
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, name, rating`;
    const { rows:[player] } = await pool.query(upsert, [name]);
    res.json(player);
  } catch (e) { next(e); }
});

app.get("/api/players", async (_req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT id, name, rating FROM players ORDER BY rating DESC LIMIT 50");
    res.json(rows);
  } catch (e) { next(e); }
});

app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: true } });

const queue = []; // { socketId, player }
const rooms = new Map(); // roomId -> { board, xTurn, players:{X,O}, moves:[] }

function checkWinner(b) {
  const L = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a,b2,c] of L) if (b[a] && b[a]===b[b2] && b[a]===b[c]) return b[a];
  return b.every(Boolean) ? 'draw' : null;
}

io.on("connection", (socket) => {
  socket.on("queue", async (player) => {
    queue.push({ socketId: socket.id, player });
    if (queue.length >= 2) {
      const a = queue.shift();
      const b = queue.shift();
      const roomId = `room_${a.player.id}_${b.player.id}_${Date.now()}`;
      const X = Math.random() < 0.5 ? a : b;
      const O = X === a ? b : a;
      rooms.set(roomId, { board: Array(9).fill(null), xTurn: true, players: { X: X.player, O: O.player }, moves: [] });
      io.to(a.socketId).socketsJoin(roomId);
      io.to(b.socketId).socketsJoin(roomId);
      io.to(a.socketId).emit("role", { roomId, role: "X", opponent: O.player });
      io.to(b.socketId).emit("role", { roomId, role: "O", opponent: X.player });
      io.to(roomId).emit("state", { board: Array(9).fill(null), xTurn: true });
    }
  });

  socket.on("move", async ({ roomId, role, index }) => {
    const game = rooms.get(roomId);
    if (!game) return;
    if ((role === "X" && !game.xTurn) || (role === "O" && game.xTurn)) return;
    if (game.board[index]) return;
    game.board[index] = role;
    game.moves.push({ i: index, mark: role });
    game.xTurn = !game.xTurn;
    const w = checkWinner(game.board);
    io.to(roomId).emit("state", { board: game.board, xTurn: game.xTurn, last: { role, index } });
    if (w) {
      io.to(roomId).emit("final", { winner: w });
      const px = game.players.X.id; const po = game.players.O.id;
      const { rows:[rX] } = await pool.query('SELECT rating FROM players WHERE id=$1', [px]);
      const { rows:[rO] } = await pool.query('SELECT rating FROM players WHERE id=$1', [po]);
      if (rX && rO) {
        const scoreX = w === 'draw' ? 0.5 : (w === 'X' ? 1 : 0);
        const { newA, newB, deltaA } = updateElo(rX.rating, rO.rating, scoreX);
        await pool.query('UPDATE players SET rating=$1 WHERE id=$2', [newA, px]);
        await pool.query('UPDATE players SET rating=$1 WHERE id=$2', [newB, po]);
        await pool.query(
          'INSERT INTO games(player_x,player_o,winner,is_draw,moves,rating_delta) VALUES($1,$2,$3,$4,$5,$6)',
          [px, po, w==='draw'?null:(w==='X'?px:po), w==='draw', JSON.stringify(game.moves), deltaA]
        );
        io.to(roomId).emit('ratings', { [px]: newA, [po]: newB });
      }
      rooms.delete(roomId);
    }
  });

  socket.on("disconnect", () => {
    const i = queue.findIndex(q => q.socketId === socket.id);
    if (i >= 0) queue.splice(i, 1);
  });
});

const PORT = process.env.PORT || 8080;
initDb().then(() => server.listen(PORT, () => console.log(`API+Web+WS on http://localhost:${PORT}`)));