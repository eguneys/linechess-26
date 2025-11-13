import express from "express";
import sqlite3 from "better-sqlite3";
import session from 'express-session'
import SessionStore from 'better-sqlite3-session-store'
import bodyParser from "body-parser";
import cors from "cors";
import rateLimit from 'express-rate-limit';

const SECRET = process.env.SECRET_SALT || 's3cr3t-s@lt'

const gen_id = () => Math.random().toString(16).slice(2, 10)
const uuidv4_user = () => `ou${gen_id()}`
const uuidv4_playlist = () => `opi${gen_id()}`
const uuidv4_line = () => `oli${gen_id()}`
const uuidv4_like = () => `lik${gen_id()}`

const app = express();
app.use(cors({ credentials: true, origin: true }));
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

app.get("/session/init", async (req, res) => {
    if (!req.session.userId) {
        const id = uuidv4_user();
        await db.prepare(`INSERT INTO users (id) VALUES (?)`).run([id]);
        req.session.userId = id;
        console.log("🆕 Created guest user:", id);
    }
    res.json({ ok: true });
});


function requireSession(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json(error("No session"));
    }
    next();
}

app.use(requireSession)


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
            slot INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(playlist_id) REFERENCES playlists(id)
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS line_likes (
            id TEXT PRIMARY KEY,
            line_id TEXT,
            user_id TEXT,
            yes NUMBER DEFAULT 1,
            FOREIGN KEY(line_id) REFERENCES lines(id),
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS playlist_likes (
            id TEXT PRIMARY KEY,
            playlist_id TEXT,
            user_id TEXT,
            yes NUMBER DEFAULT 1,
            FOREIGN KEY(playlist_id) REFERENCES playlists(id),
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
    `);




}


const WorkingPlaylistName = `Working Playlist`

// -- DB Utility ---

async function db_insert_playlist(db, userId, name, line) {
    const id = uuidv4_playlist();
    await db.prepare(`INSERT INTO playlists (id, user_id, name) VALUES (?, ?, ?)`).run([id, userId, name]);
    const playlist = await db.prepare(`SELECT 
        p.*,
        (SELECT yes FROM playlist_likes where playlist_id = p.id AND user_id = ?) as have_liked
        FROM playlists p
        WHERE id=?`).get([userId, id]);
    return playlist
}


// --- Utility ---
function ok(data) { return { ok: true, data }; }
function error(message) { return { ok: false, errors: message }; }

function playlist_view_json(playlist) {
    return {
        _id: playlist.id,
        name: playlist.name,
        nb_lines: playlist.nb_lines,
        nb_likes: playlist.nb_likes,
        created_at: playlist.created_at,
        have_liked: playlist.have_liked === 1
    }
}

function line_view_json(line) {
    return {
        _id: line.id,
        _playlist_id: line.playlist_id,
        name: line.name,
        moves: line.moves,
        orientation: line.orientation,
        slot: line.slot,
        nb_likes: line.nb_likes,
        created_at: line.created_at,
    }
}

function paginated(page, pageSize, count, list) {
    return {
        max_per_page: pageSize,
        nb_pages: Math.ceil(count / pageSize),
        page,
        list
    }
}


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

app.post("/playlist/like", async (req, res) => {
    const userId = req.session.userId
    const { id: playlist_id , yes } = req.body;


    let res2 = await db.prepare(`SELECT id from playlist_likes WHERE user_id = ? AND playlist_id = ?`).get([userId, playlist_id])

    if (res2 === undefined) {
        let id = uuidv4_like()
        await db.prepare(`INSERT INTO playlist_likes (id, playlist_id, user_id) VALUES (?, ?, ?)`).run([id, playlist_id, userId]);
    } else {
        await db.prepare(`UPDATE playlist_likes SET yes=? WHERE id=?`).run([yes ? 1 : 0, res2.id]);
    }


    res.json(ok(null));
});

app.post("/playlist/edit", async (req, res) => {
    const { id, body } = req.body;
    await db.prepare(`UPDATE playlists SET name=? WHERE id=?`).run(body.name, id);
    const playlist = await db.prepare(`SELECT * FROM playlists WHERE id=?`).get(id);
    res.json(ok(playlist_view_json(playlist)));
});

app.post("/playlist/create", async (req, res) => {

    let userId = req.session.userId

    const { name, line } = req.body;
    let playlist = await db_insert_playlist(db, userId, name, line)
    res.json(ok(playlist_view_json(playlist)));
});

app.post("/playlist/delete", async (req, res) => {
    const { id } = req.body;
    await db.prepare(`DELETE FROM playlist_likes WHERE playlist_id=?`).run([id]);
    await db.prepare(`DELETE FROM lines WHERE playlist_id=?`).run([id]);
    await db.prepare(`DELETE FROM playlists WHERE id=?`).run([id]);
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
    let userId = req.session.userId
    let playlist_id = req.body.playlist_id
    const { name, moves, orientation } = req.body;

    if (playlist_id === undefined) {
        playlist_id = (await db.prepare(`SELECT id FROM playlists WHERE name=? AND user_id=?`).get([WorkingPlaylistName, userId])).id
    }

    const { slot } = await db.prepare(`SELECT COUNT(*) as slot FROM lines WHERE playlist_id=?`).get([playlist_id]);

    const line_id = uuidv4_line();
    await db.prepare(
        `INSERT INTO lines (id, playlist_id, name, moves, orientation, slot) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run([line_id, playlist_id, name, moves, orientation, slot]);

    const line = await db.prepare(`SELECT l.*,
        (SELECT COUNT(*) FROM line_likes WHERE line_id = l.id AND yes = 1) as nb_likes
        FROM lines l
        WHERE id=?`).get([line_id]);
    res.json(ok(line_view_json(line)));
});

app.post("/line/set_ordered", async (req, res) => {
    let userId = req.session.userId
    let { playlist_id, lines } = req.body

    if (!playlist_id || !Array.isArray(lines)) {
        return res.status(400).json(error('Invalid input'));
    }
    
    const {user_id} = await db.prepare(`SELECT user_id FROM playlists WHERE id=?`).get([playlist_id]);
    
    if (user_id !== userId) {
        res.status(400).json(error("Unauthorized."))
        return
    }

    const updates = lines.map((id, index) =>
        db.prepare('UPDATE lines SET slot = ? WHERE id = ? AND playlist_id = ?').run([index, id, playlist_id])
    );

    await Promise.all(updates)

    res.json(ok(null));
});

app.get("/playlist/search", async (req, res) => {
    const playlists = await db.all(`SELECT * FROM playlists ORDER BY created_at DESC`);
    res.json(ok(playlists));
});

app.get("/playlist/global/recent", async (req, res) => {
    const playlists = await db.prepare(`SELECT * FROM playlists ORDER BY created_at DESC LIMIT 10`).all();
    res.json(ok(playlists));
});

app.get("/playlist/mine/recent", async (req, res) => {
    res.json(ok([]));
});

app.get("/playlist/global", async (req, res) => {
    let page = parseInt(req.query.page) || 1
    const pageSize = 20
    const offset = (page - 1) * pageSize
    const { count } = await db.prepare(`SELECT COUNT(*) as count FROM playlists`).get()

    const playlists = await db.prepare(`
        SELECT * FROM playlists
        INNER JOIN users
        ON users.lichess_id IS NOT null
        AND users.id = playlists.user_id
        AND name <> 'Working Lines'
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
        `).all([pageSize, offset]);
    res.json(paginated(page, pageSize, count, playlists.map(playlist_view_json)));
});

app.get("/playlist/mine", async (req, res) => {
    let userId = req.session.userId
    const playlists = await db.prepare(`SELECT p.*,
        (SELECT COUNT(*) FROM lines WHERE playlist_id = p.id) as nb_lines,
        (SELECT COUNT(*) FROM playlist_likes WHERE playlist_id = p.id AND yes = 1) as nb_likes,
        (SELECT yes FROM playlist_likes where playlist_id = p.id AND user_id = ?) as have_liked
        FROM playlists p
        WHERE user_id=? ORDER BY created_at DESC`).all(userId, userId);
    res.json(playlists.map(playlist_view_json));
});

app.get("/playlist/liked", async (req, res) => {

    const userId = req.session.userId

    const playlists = await db.prepare(`
        SELECT p.*,
        (SELECT COUNT(*) FROM lines WHERE playlist_id = p.id) as nb_lines,
        (SELECT COUNT(*) FROM playlist_likes WHERE playlist_id = p.id AND yes = 1) as nb_likes
        FROM playlist_likes
        INNER JOIN playlists p
        ON p.id = playlist_likes.playlist_id
        AND playlist_likes.user_id = ? 
        AND playlist_likes.yes = 1
        `).all(userId);

    res.json(playlists.map(playlist_view_json));
});

app.get("/playlist/selected", async (req, res) => {
    let userId = req.session.userId
    let playlist = await db.prepare(`SELECT p.*,
        (SELECT COUNT(*) FROM lines WHERE playlist_id = p.id) as nb_lines,
        (SELECT COUNT(*) FROM playlist_likes WHERE playlist_id = p.id AND yes = 1) as nb_likes,
        (SELECT yes FROM playlist_likes where playlist_id = p.id AND user_id = ?) as have_liked
        FROM playlists p 
        WHERE name=? AND user_id=?`
    ).get(userId, WorkingPlaylistName, userId);


    if (playlist === undefined) {
        playlist = await db_insert_playlist(db, userId, WorkingPlaylistName)
    }

    const lines = await db.prepare(`
        SELECT l.*,
        (SELECT COUNT(*) FROM line_likes WHERE line_id = l.id AND yes = 1) as nb_likes
        FROM lines l
        WHERE playlist_id=?`).all([playlist.id]);
 
    res.json({ playlist: playlist_view_json(playlist), lines: lines.map(line_view_json) });
});



app.get("/playlist/selected/:id", async (req, res) => {
    const userId = req.session.userId
    let playlist_id = req.params.id
    const playlist = await db.prepare(`SELECT p.*,
        (SELECT COUNT(*) FROM lines WHERE playlist_id = p.id) as nb_lines,
        (SELECT COUNT(*) FROM playlist_likes WHERE playlist_id = p.id AND yes = 1) as nb_likes,
        (SELECT yes FROM playlist_likes where playlist_id = p.id AND user_id = ?) as have_liked
        FROM playlists p
        WHERE id=?`).get(userId, playlist_id);


    if (playlist === undefined) {
        res.json(error("Playlist not found"))
        return
    }

    const lines = await db.prepare(`SELECT 
        l.*,
        (SELECT COUNT(*) FROM line_likes WHERE line_id = l.id AND yes = 1) as nb_likes 
        FROM lines l
        WHERE playlist_id=?`).all([playlist_id]);
    res.json({ playlist: playlist_view_json(playlist), lines: lines.map(line_view_json) });
});


// -- Error Handling --

function defaultErrorHandler (err, req, res, next) {
  console.error(err)
  res.status(500).send({ errors: err.message })
}

app.use(defaultErrorHandler)


// --- Start ---
const PORT = 3300;
initDb().then(() => {
    app.listen(PORT, () => console.log(`✅ Backend running on http://localhost:${PORT}`));
});