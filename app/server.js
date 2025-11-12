import express from "express";
import sqlite3 from "better-sqlite3";
import session from 'express-session'
import SessionStore from 'better-sqlite3-session-store'
import bodyParser from "body-parser";
import cors from "cors";
import rateLimit from 'express-rate-limit';

const SECRET = process.env.SECRET_SALT || 's3cr3t-s@lt'

const gen_id = () => Math.random().toString(16).slice(2, 10)
const uuidv4_user = `ou${gen_id()}`
const uuidv4_playlist = `opi${gen_id()}`
const uuidv4_line = `oli${gen_id()}`

const app = express();
app.use(cors());
app.use(bodyParser.json());


// Rate limiting: 1 request per 15 seconds per IP
const limiter = rateLimit({
  windowMs: 15 * 1000,
  max: 3,
  message: { error: 'Too many submissions. Try again soon.' }
});
app.use('/submit', limiter);

const SqliteStore = SessionStore(session)
const session_db = new sqlite3('db/sessions.db')

app.use(session({
    store: new SqliteStore({
        client: session_db,
        expired: {
            clear: true,
            intervalMs: 15 * 60 * 1000
        },
    }),
    secret: SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 400 * 1000 * 60 * 60 * 24 * 7 } // 400 weeks
}))

// --- Session Authorization --

app.use(async (req, res, next) => {
    if (!req.session.userId) {
        // Create an anonymous user
        const id = uuidv4_user();
        await db.run(`INSERT INTO users (id, username) VALUES (?, ?)`, [id, `guest-${id.slice(0, 6)}`]);
        req.session.userId = id;
        console.log("🆕 Created guest session:", id);
    }
    next();
});



function requireSession(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ ok: false, error: "No session" });
    }
    next();
}


/*
app.post("/upgrade-account", async (req, res) => {
    const { username, password } = req.body;
    await db.run(`UPDATE users SET username=?, password=? WHERE id=?`, [username, password, req.session.userId]);
    res.json({ ok: true });
});
*/


let db;

// --- Database setup ---
async function initDb() {

    db = sqlite3("db/openings.db");

    db.pragma('journal_mode = WAL')

    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            lichess_id TEXT
            lichess_token TEXT
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS playlists (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS lines (
            id TEXT PRIMARY KEY,
            playlist_id TEXT,
            name TEXT,
            moves TEXT,
            orientation TEXT,
            liked INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(playlist_id) REFERENCES playlists(id)
        );
    `);
}

// --- Utility ---
function ok(data) { return { ok: true, data }; }
function err(message) { return { ok: false, error: message }; }



// --- Routes ---

app.post("/undo", async (req, res) => {
    // placeholder for undo functionality
    res.json(ok(null));
});

app.post("/search", async (req, res) => {
    const { term } = req.body;
    const playlists = await db.all(
        `SELECT * FROM playlists WHERE name LIKE ? ORDER BY created_at DESC`,
        [`%${term || ""}%`]
    );
    res.json(ok(playlists));
});

app.post("/search/next-page", async (req, res) => {
    res.json(ok([]));
});

app.post("/playlist/next-page", async (req, res) => {
    res.json(ok([]));
});

app.post("/line/like", async (req, res) => {
    const { id, yes } = req.body;
    await db.run(`UPDATE lines SET liked=? WHERE id=?`, [yes ? 1 : 0, id]);
    res.json(ok(null));
});

app.post("/playlist/like", async (req, res) => {
    const { id, yes } = req.body;
    await db.run(`UPDATE playlists SET liked=? WHERE id=?`, [yes ? 1 : 0, id]);
    res.json(ok(null));
});

app.post("/playlist/edit", async (req, res) => {
    const { id, body } = req.body;
    await db.run(`UPDATE playlists SET name=? WHERE id=?`, [body.name, id]);
    const playlist = await db.get(`SELECT * FROM playlists WHERE id=?`, [id]);
    res.json(ok(playlist));
});

app.post("/playlist/create", async (req, res) => {
    const { name, line } = req.body;
    const id = uuidv4_playlist();
    await db.run(`INSERT INTO playlists (id, name) VALUES (?, ?)`, [id, name]);
    const playlist = await db.get(`SELECT * FROM playlists WHERE id=?`, [id]);
    res.json(ok(playlist));
});

app.post("/playlist/delete", async (req, res) => {
    const { id } = req.body;
    await db.run(`DELETE FROM playlists WHERE id=?`, [id]);
    await db.run(`DELETE FROM lines WHERE playlist_id=?`, [id]);
    res.json(ok(null));
});

app.post("/playlist/add", async (req, res) => {
    const { id, line_id } = req.body;
    await db.run(`UPDATE lines SET playlist_id=? WHERE id=?`, [id, line_id]);
    res.json(ok(null));
});

app.post("/line/delete", async (req, res) => {
    const { id } = req.body;
    await db.run(`DELETE FROM lines WHERE id=?`, [id]);
    res.json(ok(null));
});

app.post("/line/edit", async (req, res) => {
    const { id, name, moves, orientation } = req.body;
    await db.run(`UPDATE lines SET name=?, moves=?, orientation=? WHERE id=?`, [name, moves, orientation, id]);
    const line = await db.get(`SELECT * FROM lines WHERE id=?`, [id]);
    res.json(ok(line));
});

app.post("/line/create", async (req, res) => {
    const { id: playlist_id, name, moves, orientation } = req.body;
    const line_id = uuidv4();
    await db.run(
        `INSERT INTO lines (id, playlist_id, name, moves, orientation) VALUES (?, ?, ?, ?, ?)`,
        [line_id, playlist_id, name, moves, orientation]
    );
    const line = await db.get(`SELECT * FROM lines WHERE id=?`, [line_id]);
    res.json(ok(line));
});

app.post("/line/swap", async (req, res) => {
    // This is just a placeholder for reordering lines
    res.json(ok(null));
});

app.get("/playlist/search", async (req, res) => {
    const playlists = await db.all(`SELECT * FROM playlists ORDER BY created_at DESC`);
    res.json(ok(playlists));
});

app.get("/playlist/global/recent", async (req, res) => {
    const playlists = await db.all(`SELECT * FROM playlists ORDER BY created_at DESC LIMIT 10`);
    res.json(ok(playlists));
});

app.get("/playlist/mine/recent", async (req, res) => {
    res.json(ok([]));
});

app.get("/playlist/global", async (req, res) => {
    const playlists = await db.all(`SELECT * FROM playlists`);
    res.json(ok(playlists));
});

app.get("/playlist/mine", async (req, res) => {
    res.json(ok([]));
});

app.get("/playlist/liked", async (req, res) => {
    const playlists = await db.all(`SELECT * FROM playlists WHERE liked=1`);
    res.json(ok(playlists));
});

app.get("/playlist/selected/:id", async (req, res) => {
    const playlist = await db.get(`SELECT * FROM playlists WHERE id=?`, [req.params.id]);
    const lines = await db.all(`SELECT * FROM lines WHERE playlist_id=?`, [req.params.id]);
    res.json(ok({ playlist, lines }));
});

// --- Start ---
const PORT = 3300;
initDb().then(() => {
    app.listen(PORT, () => console.log(`✅ Backend running on http://localhost:${PORT}`));
});