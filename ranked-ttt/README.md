# Ranked Tic-Tac-Toe (Realtime)

A full-stack, Dockerized web application that lets players compete in ranked Tic-Tac-Toe games with ELO-based ratings and realtime gameplay via WebSockets.

---

## Features
- **Frontend**: Plain HTML, CSS, and JavaScript
- **Backend**: Node.js + Express + Socket.IO
- **Database**: PostgreSQL (with player, game, and rating data)
- **Matchmaking**: Queue system pairs players of similar rating
- **Ranking System**: ELO calculation updates ratings after each game
- **Realtime**: Moves broadcast via WebSockets for synchronized play
- **Dockerized**: Runs with a single `docker compose up`

---

## Requirements
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- (Optional) Node.js and npm if you want to run outside Docker

---

## Quickstart
1. Clone the repository:
   ```bash
   git clone https://github.com/Russell-Cannon/languages-rrcannon/tree/main/ranked-ttt
   cd ranked-ttt
   ```

2. Copy environment template:
   ```bash
   cp .env.example .env
   ```

3. Build and run:
   ```bash
   docker compose up --build
   ```

4. Open [http://localhost:8080](http://localhost:8080) in two browser tabs and sign in with different names to play against yourself.

---

## Project Structure
```
ranked-ttt/
├── docker-compose.yml      # Orchestrates Postgres + Node containers
├── server/
│   ├── Dockerfile          # Builds Node server image
│   ├── package.json        # Dependencies (Express, Socket.IO, etc.)
│   └── src/
│       └── index.js        # Express + Socket.IO server
└── web/
    ├── index.html          # UI entrypoint
    ├── styles.css          # Basic styling
    └── app.js              # Client-side game + socket logic
```

---

## Database Schema
### Players
```sql
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  rating INT NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Games
```sql
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_x UUID REFERENCES players(id),
  player_o UUID REFERENCES players(id),
  winner UUID REFERENCES players(id),
  is_draw BOOLEAN NOT NULL DEFAULT FALSE,
  moves JSONB NOT NULL,
  rating_delta INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Gameplay Flow
1. User signs in with a name → creates/fetches player in DB.
2. Click **Find Match** → enters matchmaking queue.
3. When 2 players are queued, a room is created, roles (X/O) are assigned.
4. Players alternate making moves; board syncs via Socket.IO.
5. At game end → winner/draw recorded in DB, ratings updated.
6. Leaderboard updates live.

---

## Development Notes
- To add features, edit `web/` (frontend) or `server/src/index.js` (backend).
- Run `docker compose up --build` if you modify Dockerfile or package.json.
- Otherwise, just `docker compose up` is enough after source changes.
- For hot reload, you could mount source with nodemon.

---

## License
MIT — use freely with attribution.

