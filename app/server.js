import express from "express";
import sqlite3 from "better-sqlite3";
import session, { Session } from 'express-session'
import SessionStore from 'better-sqlite3-session-store'
import bodyParser from "body-parser";
import cors from "cors";
import rateLimit from 'express-rate-limit';

import passport from 'passport'
import LichessStrategy from 'passport-lichess'

import { computeOFS } from './compute_ofs.ts'

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
session_db.pragma('journal_mode = WAL')

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


    let user = await db.prepare(`SELECT * from users WHERE id = ?`).get(req.session.userId)

    res.json(ok(user_view_json(user)));
});


function requireSession(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json(error("No session"));
    }
    next();
}

app.use(requireSession)


async function Session_DB_Upgrade_User_To_Lichess(req, lichess_access_token, lichess_username) {

    let existing_user = await db.prepare(`SELECT id from users WHERE lichess_username = ?`).get([lichess_username])

    if (existing_user !== undefined) {

        await db.prepare(`UPDATE users SET lichess_access_token=?, lichess_username=? WHERE id=?`)
            .run([lichess_access_token, lichess_username, existing_user.id]);

        req.session.userId = existing_user.id
    } else {

        await db.prepare(`UPDATE users SET lichess_access_token=?, lichess_username=? WHERE id=?`)
            .run([lichess_access_token, lichess_username, req.session.userId]);
    }
}

/*
app.post("/upgrade-account", async (req, res) => {
    const { lichess_username } = req.body;

    let user = await Session_DB_Upgrade_User_To_Lichess(req, 'no_token', lichess_username)

    res.json({ ok: true });
});
*/


app.post("/logout", async (req, res) => {
    req.session.userId = undefined

    res.send(ok(null))
})

import config from './config.json' with { type: 'json' }

// -- Passport Lichess --

const domain = config.domain

passport.use(new LichessStrategy({
    clientID: gen_id(),
    callbackURL: `${domain}/auth/lichess/callback`,
    passReqToCallback: true
}, async function (req, accessToken, refreshToken, profile, cb) {

    let user = await Session_DB_Upgrade_User_To_Lichess(req, accessToken, profile.username)

    cb(null, user)
}))

app.get('/auth/lichess', passport.authenticate('lichess'))

app.get('/auth/lichess/callback', passport.authenticate('lichess', {
    successRedirect: config.spa_domain,
    failureRedirect: config.spa_domain 
}))


app.post('/logout', function(req, res, next) {
    req.logout(function(err) {
        if (err) { return next(err) }
        res.send(ok(null))
    })
})

app.post('/fetch_lichess_token', async function(req, res, next) {

    let token = await db.prepare(`SELECT lichess_access_token from users WHERE id = ?`).get([req.session.userId])
    if (token === undefined) {
        res.status(400).send(error("Not logged in."))
        return
    }
    res.send(ok({token: token.lichess_access_token}))
})



let db;

// --- Database setup ---
async function initDb() {

    db = sqlite3("db/openings.db")

    db.pragma('journal_mode = WAL')

    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            lichess_username TEXT,
            lichess_access_token TEXT
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



    await db.exec(`
        CREATE TABLE IF NOT EXISTS ofs_games (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            best_match_line_id TEXT,

            created_at NUMBER,
            color TEXT,
            you TEXT,
            opponent TEXT,
            time_control TEXT,
            did_you_lose NUMBER,
            did_you_win NUMBER,
            ucis TEXT,

            ofs NUMBER,
            depth NUMBER,
            did_you_deviated NUMBER,
            nb_deviation NUMBER,

            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(best_match_line_id) REFERENCES lines(id)
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

function ofs_view_json(game) {
    return {
        id: game.id,
        created_at: game.created_at,
        color: game.color,
        you: game.you,
        opponent: game.opponent,
        time_control: game.time_control,
        did_you_lose: game.did_you_lose === 1,
        did_you_win: game.did_you_win === 1,
        ucis: game.ucis,
        ofs: game.ofs,
        depth: game.depth,
        did_you_deviated: game.did_you_deviated === 1,
        nb_deviation: game.nb_deviation,
        best_match_line_id: game.best_match_line_id
    }
}



function playlist_view_json(playlist) {
    return {
        _id: playlist.id,
        name: playlist.name,
        author: playlist.author,
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

function user_view_json(user) {
    return {
        lichess_username: user.lichess_username
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

/*
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
*/

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
    const { id } = req.body
    await db.prepare(`DELETE FROM line_likes WHERE line_id=?`).run([id]);
    await db.prepare(`DELETE FROM lines WHERE id=?`).run([id]);
    res.json(ok(null));
});

app.post("/line/edit", async (req, res) => {
    const { id, name, moves, orientation } = req.body;
    
    if (!id) {
        return res.status(400).json({ error: "ID is required" });
    }

    // Build dynamic update query
    const updates = [];
    const params = [];

    if (name !== undefined) {
        updates.push("name = ?");
        params.push(name);
    }
    if (moves !== undefined) {
        updates.push("moves = ?");
        params.push(moves);
    }
    if (orientation !== undefined) {
        updates.push("orientation = ?");
        params.push(orientation);
    }

    // If no fields to update, return early
    if (updates.length === 0) {
        const line = await db.prepare(`SELECT * FROM lines WHERE id=?`).get([id]);
        return res.json(ok(line_view_json(line)));
    }

    // Add ID to params for WHERE clause
    params.push(id);

    // Execute update
    const query = `UPDATE lines SET ${updates.join(", ")} WHERE id=?`;
    await db.prepare(query).run(params);

    // Return updated line
    const line = await db.prepare(`SELECT * FROM lines WHERE id=?`).get([id]);
    res.json(ok(line_view_json(line)));
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
    const userId = req.session.userId
    let page = parseInt(req.query.page) || 1
    const pageSize = 20
    const offset = (page - 1) * pageSize
    const { count } = await db.prepare(`SELECT COUNT(*) as count FROM playlists`).get()

    const playlists = await db.prepare(`
        SELECT p.*, 
        (SELECT COUNT(*) FROM lines WHERE playlist_id = p.id) as nb_lines,
        (SELECT COUNT(*) FROM playlist_likes WHERE playlist_id = p.id AND yes = 1) as nb_likes,
        (SELECT yes FROM playlist_likes where playlist_id = p.id AND user_id = ?) as have_liked,
        users.lichess_username as author
        FROM playlists p
        INNER JOIN users
        ON users.lichess_username IS NOT null
        AND users.id = p.user_id
        AND name <> 'Working Playlist'
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
        `).all([userId, pageSize, offset]);
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


    let author = await db.prepare(`SELECT lichess_username FROM users WHERE id = ?`).get([playlist.user_id])
    playlist.author = author?.lichess_username

    const lines = await db.prepare(`SELECT 
        l.*,
        (SELECT COUNT(*) FROM line_likes WHERE line_id = l.id AND yes = 1) as nb_likes 
        FROM lines l
        WHERE playlist_id=?`).all([playlist_id]);

    res.json({ playlist: playlist_view_json(playlist), lines: lines.map(line_view_json) });
});

app.post('/ofs/stats', async (req, res) => {
    let userId = req.session.userId
    let { query } = req.body

    if (!Array.isArray(query) || query.length > 70) {
        res.json(error("Bad query"))
        return
    }

    // get today's games
    query = query.filter(_ => is_timestamp_in_today(_.created_at))

    let pages = await Compute_OFS_and_send_daily(userId, query)


    let line_ids = pages.map(_ => _.best_match_line_id).filter(Boolean)

    const placeholders = line_ids.map(() => '?').join(',');

    const stmt = db.prepare(`SELECT lines.*, playlists.name as playlist_name, playlists.id as playlist_id FROM lines INNER JOIN playlists ON playlists.id = lines.playlist_id AND lines.id IN (${placeholders})`);
    const lines = stmt.all(...line_ids);

    res.send(ok({ pages, lines }))
})

async function Compute_OFS_and_send_daily(user_id, query) {

    let games = db.prepare(`SELECT * FROM ofs_games WHERE user_id = ?`).all(user_id)

    let ids = games.map(_ => _.id)
    query = query.filter(game => !ids.includes(game.id))

    let drop_games = games.filter(game => !is_timestamp_in_today(game.created_at))

    games = games.filter(game => is_timestamp_in_today(game.created_at))

    let ofs_data = await Get_OFS_Data_For_User(user_id)

    query = query.map(game => fill_ofs_stats(ofs_data, game))

    const db_delete = db.prepare('DELETE FROM ofs_games WHERE id = ?')

    const deleteMany = db.transaction((data) => {
        for (const item of data) {
            db_delete.run([item.id])
        }
    })

    deleteMany(drop_games)

    const insert = db.prepare(`INSERT INTO ofs_games (
        id, user_id, 
        best_match_line_id,
        created_at, color, 
        you, opponent, 
        time_control, 
        did_you_lose, did_you_win, ucis
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    const update = db.prepare('UPDATE ofs_games SET ofs = ?, depth = ?, did_you_deviated = ?, nb_deviation = ? WHERE id = ?')

    const insertMany = db.transaction((data) => {
        for (const item of data) {
            insert.run([item.id, user_id, item.best_match_line_id ?? null, item.created_at, item.color, item.you, item.opponent, item.time_control, item.did_you_lose ? 1 : 0, item.did_you_win ? 1 : 0, item.ucis])
            update.run([item.ofs, item.depth, item.did_you_deviated ? 1 : 0, item.nb_deviation, item.id])
        }
    })

    insertMany(query)

    return [...games.map(ofs_view_json), ...query]
}

async function Get_OFS_Data_For_User(user_id, ucis) {
    let lines = await db.prepare(`SELECT lines.* FROM lines INNER JOIN playlists ON playlists.id = lines.playlist_id AND playlists.user_id = ?`).all([user_id])

    return lines
}

function fill_ofs_stats(ofs_data, game) {
    
    let best_match

    let game_ucis = game.ucis.split(' ')
    let nb_deviation = Math.min(30, game_ucis.length)

    while (nb_deviation > 0) {

        best_match = ofs_data.filter(str => game_ucis.join(' ').includes(str.moves.split(' ').slice(0, nb_deviation).join(' ')))
            .sort((a, b) => b.length - a.length)[0]

        if (best_match !== undefined) {
            nb_deviation = Math.min(nb_deviation, best_match.moves.split(' ').length)
            break
        }

        nb_deviation -= 1
    }

    if (best_match === undefined) {
        game.ofs = 0
        game.depth = 0
        game.did_you_deviated = true
        game.nb_deviation = 0
        return game
    }

    let opening_moves = best_match.moves.split(' ')
    let played_moves= opening_moves.slice(0, nb_deviation)

    let all_completed = nb_deviation === opening_moves.length

    let did_you_deviated = (game.color === 'black') === (played_moves.length % 2 === 0)

    let line_id = best_match.id

    let deviator = did_you_deviated ? 'user' : all_completed ? 'none' : 'opponent'
    let result = game.did_you_win ? 'win' : (game.did_you_lose ? 'loss' : 'draw')
    let totalMoves = opening_moves.length

    let res = computeOFS({
        matchedMoves: nb_deviation,
        deviator,
        result,
        totalMoves
    })

    let ofs = res.OFS
    let depth = res.Depth

    game.ofs = ofs
    game.depth = depth
    game.did_you_deviated = did_you_deviated
    game.nb_deviation = nb_deviation
    game.best_match_line_id = line_id

    return game
}

function is_timestamp_in_today(timestamp) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return timestamp >= today.getTime() && timestamp < tomorrow.getTime()
}

// -- Error Handling --

function defaultErrorHandler (err, req, res, next) {
  console.error(err)
  res.status(500).send({ errors: err.message })
}

app.use(defaultErrorHandler)


// --- Start ---
const PORT = process.env.PORT || config.port || 3300;
initDb().then(() => {
    app.listen(PORT, (err) => {
        if (err) {
            console.error(err)
        } else {
            console.log(`✅ Backend running on ${config.domain.split(':').slice(0, -1).join(':')}:${PORT}`)
        }
    });
});