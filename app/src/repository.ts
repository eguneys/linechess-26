import { Result } from "@badrap/result";
import sqlite3 from "better-sqlite3";
import type { Color, Game, Line, LineId, OFS_Game_Query, Playlist, PlaylistId, Ucis, User, UserId } from "./types.ts";

let db: sqlite3.Database

// --- Database setup ---
export async function init_db() {

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

export const gen_id = () => Math.random().toString(16).slice(2, 10)
export const uuidv4_user = () => `ou${gen_id()}`
export const uuidv4_playlist = () => `opi${gen_id()}`
export const uuidv4_line = () => `oli${gen_id()}`
export const uuidv4_like = () => `lik${gen_id()}`

export class DatabaseExecutionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DatabaseExecutionError';
    }

}

export async function create_user(): Promise<Result<User>> {
    const id = uuidv4_user();
    try {
        await db.prepare(`
            INSERT INTO users (id) VALUES (?)
            `).run([id]);
    } catch (err) {

        console.error('Database execution error in create_user:', err)

        return Result.err(new DatabaseExecutionError('Failed to create user'))
    }

    return Result.ok({ id })
}


export async function find_user_by_id(id: string): Promise<Result<User | undefined>> {
    try {
        let user = await db.prepare(`
            SELECT * from users WHERE id = ?
            `).get(id) as User | undefined

        return Result.ok(user)
    } catch (err) {

        console.error('Database execution error in find_user_by_id:', err)

        return Result.err(new DatabaseExecutionError('Failed to find user'))
    }
}


export async function get_lichess_token_by_user_id(user_id: string): Promise<Result<{ lichess_access_token: string } | undefined>> {
    try {
        const token = db.prepare(`
            SELECT lichess_access_token from users WHERE id = ?
        `).get(user_id) as { lichess_access_token: string } | undefined

        return Result.ok(token)
    } catch (e) {
        return Result.err(new Error('Failed to find token'))
    }
}


export async function upgrade_user_to_lichess(user_id: string, lichess_access_token: string, lichess_username: string): Promise<Result<void>> {
    try {
        await db.prepare(`
            UPDATE users SET lichess_access_token=?, lichess_username=? WHERE id=?
            `).run([lichess_access_token, lichess_username, user_id]);

        return Result.ok(void 0)
    } catch (e) {

        console.error('Database execution error in upgrade_user_to_lichess:', e)

        return Result.err(new DatabaseExecutionError('Failed to upgrade user to lichess'))
    }
}

export async function find_user_by_lichess_username(lichess_username: string): Promise<Result<User | undefined>> {
    try {
        let existing_user = await db.prepare(`
            SELECT id from users WHERE lichess_username = ?
            `).get([lichess_username]) as User | undefined

        return Result.ok(existing_user)
    } catch (e) {

        console.error('Database execution error in find_user_by_lichess_username:', e)

        return Result.err(new Error('Failed to find user'))
    }
}


export async function find_playlist_likes_by_id(user_id: UserId, playlist_id: PlaylistId): Promise<Result<Playlist | undefined>> {

    try {
        let res = await db.prepare(`
            SELECT id from playlist_likes WHERE user_id = ? AND playlist_id = ?
            `).get([user_id, playlist_id]) as Playlist | undefined

        return Result.ok(res)
    } catch (err) {
        
        console.error('Database execution error in find_playlist_likes_by_id:', err)

        return Result.err(new DatabaseExecutionError('Failed to find playlist'))
    }
}


export async function create_playlist_like(playlist_id: PlaylistId, user_id: UserId): Promise<Result<void>> {
    try {
        let id = uuidv4_like()

        await db.prepare(`
            INSERT INTO playlist_likes (id, playlist_id, user_id) VALUES (?, ?, ?)
            `).run([id, playlist_id, user_id]);

        return Result.ok(void 0)
    } catch (err) {
        return Result.err(new DatabaseExecutionError('Failed to create playlist like'))
    }
}


export async function update_playlist_like(id: string, yes: boolean): Promise<Result<void>> {
    try {
        await db.prepare(`UPDATE playlist_likes SET yes=? WHERE id=?`).run([yes ? 1 : 0, id]);

        return Result.ok(void 0)
    } catch (e) {
        return Result.err(new DatabaseExecutionError('Failed to update playlist like'))
    }
}




export async function create_playlist(user_id: UserId, name: string): Promise<Result<Playlist>> {
    try {
    const id = uuidv4_playlist();
    await db.prepare(`
        INSERT INTO playlists (id, user_id, name) VALUES (?, ?, ?)
        `).run([id, user_id, name]);

    const playlist = await db.prepare(`
        SELECT p.*,
        (SELECT COUNT(*) FROM lines WHERE playlist_id = p.id) as nb_lines,
        (SELECT COUNT(*) FROM playlist_likes WHERE playlist_id = p.id AND yes = 1) as nb_likes,
        (SELECT yes FROM playlist_likes where playlist_id = p.id AND user_id = ?) as have_liked
        FROM playlists p
        WHERE id=?
        `).get([user_id, id]) as Playlist;

        return Result.ok(playlist)
    } catch (e) {
        return Result.err(new DatabaseExecutionError('Failed to create playlist'))
    }
}

export async function update_playlist(id: PlaylistId, name: string) {
    try {
        await db.prepare(`UPDATE playlists SET name=? WHERE id=?`).run(name, id);
        
        return Result.ok(void 0)
    } catch (e) {
        return Result.err(new DatabaseExecutionError('Failed to update playlist'))
    }
}

export async function find_playlist_by_id(id: PlaylistId, user_id: UserId): Promise<Result<Playlist | undefined>> {

    try {
        let res = await db.prepare(`
            SELECT p.*, 
            (SELECT COUNT(*) FROM lines WHERE playlist_id = p.id) as nb_lines,
            (SELECT COUNT(*) FROM playlist_likes WHERE playlist_id = p.id AND yes = 1) as nb_likes,
            (SELECT yes FROM playlist_likes where playlist_id = p.id AND user_id = ?) as have_liked
            FROM playlists p WHERE id=?
            `).get([user_id, id]) as Playlist | undefined;

        if (res) {

            let author = await db.prepare(`SELECT lichess_username FROM users WHERE id = ?`).get([user_id]) as { lichess_username: string } | undefined

            if (author) {
                res.author = author.lichess_username
            }
        }

        return Result.ok(res)
    } catch (e) {
        return Result.err(new DatabaseExecutionError('Failed to find playlist'))
    }
}


export async function delete_playlist(id: PlaylistId) {
    try {
        await db.prepare(`DELETE FROM playlist_likes WHERE playlist_id=?`).run([id]);

        await db.prepare(`
            DELETE FROM line_likes 
            WHERE line_id IN (
                SELECT lines.id 
                FROM lines 
                WHERE lines.playlist_id = ?
            )
            `).run([id]);

        await db.prepare(`DELETE FROM lines WHERE playlist_id=?`).run([id]);
        await db.prepare(`DELETE FROM playlists WHERE id=?`).run([id]);
        return Result.ok(void 0)
    } catch (e) {
        return Result.err(new DatabaseExecutionError('Failed to delete playlist'))
    }
};


export async function delete_line(id: LineId) {
    try {
        await db.prepare(`DELETE FROM line_likes WHERE line_id=?`).run([id]);
        await db.prepare(`DELETE FROM lines WHERE id=?`).run([id]);
        return Result.ok(void 0)
    } catch (e) {
        return Result.err(new DatabaseExecutionError('Failed to update playlist'))
    }
}



export async function update_line(id: LineId, name: string) {
    try {
        await db.prepare(`UPDATE lines SET name=? WHERE id=?`).run(name, id);
        
        return Result.ok(void 0)
    } catch (e) {
        return Result.err(new DatabaseExecutionError('Failed to update line'))
    }
}

export async function find_line(id: LineId): Promise<Result<Line | undefined>> {

    try {
        let res = await db.prepare(`SELECT * FROM lines WHERE id=?`).get(id) as Line | undefined;

        return Result.ok(res)
    } catch (e) {
        return Result.err(new DatabaseExecutionError('Failed to find line'))
    }
}

export const WorkingPlaylistName = `Working Playlist`

export async function find_working_playlist_id(user_id: UserId): Promise<Result<{ id: PlaylistId } | undefined>> {

    try {
        let res = await db.prepare(`
            SELECT id FROM playlists WHERE name=? AND user_id=?
            `).get([WorkingPlaylistName, user_id]) as ({ id: PlaylistId }) | undefined

        return Result.ok(res)
    } catch (e) {
        return Result.err(new DatabaseExecutionError('Failed to find working playlist'))
    }
}


export async function create_line(playlist_id: PlaylistId, name: string, moves: string, orientation: Color): Promise<Result<Line | undefined>> {

    try {
        const { slot } = await db.prepare(`
        SELECT COUNT(*) as slot FROM lines WHERE playlist_id=?
        `).get([playlist_id]) as ({ slot: number });

        const line_id = uuidv4_line();

        await db.prepare(`
        INSERT INTO lines (id, playlist_id, name, moves, orientation, slot) 
        VALUES (?, ?, ?, ?, ?, ?)
        `,).run([line_id, playlist_id, name, moves, orientation, slot]);

        return find_line_by_id(line_id)
    } catch (e) {
        return Result.err(new DatabaseExecutionError('Failed to create line'))
    }
}


export async function find_line_by_id(id: LineId): Promise<Result<Line | undefined>> {
    try {
        let line = await db.prepare(`
        SELECT l.*,
        (SELECT COUNT(*) FROM line_likes WHERE line_id = l.id AND yes = 1) as nb_likes
        FROM lines l
        WHERE id=?
        `).get([id]) as Line | undefined;


        return Result.ok(line)

    } catch (e) {
        return Result.err(new DatabaseExecutionError('Failed to find line'))
    }
}


export async function order_lines(lines: LineId[], playlist_id: PlaylistId) {
    try {
        const updates = lines.map((id, index) =>
            db.prepare(`
                UPDATE lines SET slot = ? WHERE id = ? AND playlist_id = ?
                `).run([index, id, playlist_id])
        );

        await Promise.all(updates)

        return Result.ok(void 0)
    } catch (e) {
        return Result.err(new DatabaseExecutionError('Failed to order lines'))
    }
}


export async function get_playlists_count(): Promise<Result<number>> {
    try {
        const { count } = await db.prepare(`
        SELECT COUNT(*) as count FROM playlists
        `).get() as ({ count: number })

        return Result.ok(count)
    } catch (e) {
        return Result.err(new DatabaseExecutionError('Failed to get playlists count'))
    }
}

export async function get_playlists_with_offset(user_id: UserId, page_size: number, offset: number): Promise<Result<Playlist[]>> {

    try {
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
        `).all([user_id, page_size, offset]) as Playlist[];

        return Result.ok(playlists)
    } catch (e) {
        return Result.err(new DatabaseExecutionError('Failed to get playlists with offset'))
    }
}

export async function get_playlists_mine(user_id: UserId): Promise<Result<Playlist[]>> {

    try {
    const playlists = await db.prepare(`
        SELECT p.*,
        (SELECT COUNT(*) FROM lines WHERE playlist_id = p.id) as nb_lines,
        (SELECT COUNT(*) FROM playlist_likes WHERE playlist_id = p.id AND yes = 1) as nb_likes,
        (SELECT yes FROM playlist_likes where playlist_id = p.id AND user_id = ?) as have_liked
        FROM playlists p
        WHERE user_id=? ORDER BY created_at DESC
        `).all([user_id, user_id]) as Playlist[];

        return Result.ok(playlists)
    } catch (e) {
        return Result.err(new DatabaseExecutionError('Failed to get playlists mine'))
    }
}

export async function get_playlists_liked(user_id: UserId): Promise<Result<Playlist[]>> {

    try {
        const playlists = await db.prepare(`
        SELECT p.*,
        (SELECT COUNT(*) FROM lines WHERE playlist_id = p.id) as nb_lines,
        (SELECT COUNT(*) FROM playlist_likes WHERE playlist_id = p.id AND yes = 1) as nb_likes
        FROM playlist_likes
        INNER JOIN playlists p
        ON p.id = playlist_likes.playlist_id
        AND playlist_likes.user_id = ? 
        AND playlist_likes.yes = 1
        `).all(user_id) as Playlist[];

        return Result.ok(playlists)
    } catch (e) {
        return Result.err(new DatabaseExecutionError('Failed to get playlists liked'))
    }
}


export async function get_or_create_working_playlist(user_id: UserId): Promise<Result<Playlist>> {

    try {
        let playlist = await db.prepare(`
            SELECT p.*,
        (SELECT COUNT(*) FROM lines WHERE playlist_id = p.id) as nb_lines,
        (SELECT COUNT(*) FROM playlist_likes WHERE playlist_id = p.id AND yes = 1) as nb_likes,
        (SELECT yes FROM playlist_likes where playlist_id = p.id AND user_id = ?) as have_liked
        FROM playlists p 
        WHERE name=? AND user_id=?`
        ).get(user_id, WorkingPlaylistName, user_id) as Playlist | undefined;


        if (playlist === undefined) {
            return await create_playlist(user_id, WorkingPlaylistName)
        } else {
            return Result.ok(playlist)
        }

    } catch (e) {
        return Result.err(new DatabaseExecutionError('Failed to get or create working playlist'))
    }
}

export async function find_lines_for_playlist(playlist_id: PlaylistId): Promise<Result<Line[]>> {
    try {
        const lines = await db.prepare(`
        SELECT l.*,
        (SELECT COUNT(*) FROM line_likes WHERE line_id = l.id AND yes = 1) as nb_likes
        FROM lines l
        WHERE playlist_id=?`).all([playlist_id]) as Line[];

        return Result.ok(lines)
    } catch (e) {
        return Result.err(new DatabaseExecutionError('Failed to find lines for playlist'))
    }
}




export async function find_lines_as_ofs_data_for_user(user_id: UserId): Promise<Result<Line[]>> {
    try {
        let lines = await db.prepare(`
            SELECT lines.* FROM lines 
            INNER JOIN playlists 
            ON playlists.id = lines.playlist_id 
            AND playlists.user_id = ?
            `).all([user_id]) as Line[]

        return Result.ok(lines)
    } catch (e) {
        return Result.err(new DatabaseExecutionError('Failed to find ofs data for user'))
    }
}


export async function get_lines_by_ids(line_ids: LineId[]): Promise<Result<Line[]>> {
    try {

        const placeholders = line_ids.map(() => '?').join(',')

        const stmt = db.prepare(`
        SELECT lines.*, 
        playlists.name as playlist_name, 
        playlists.id as playlist_id 
        FROM lines 
        INNER JOIN playlists 
        ON playlists.id = lines.playlist_id 
        AND lines.id 
        IN (${placeholders})
        `)

        const lines = stmt.all(...line_ids) as Line[];

        return Result.ok(lines)
    } catch (e) {
        return Result.err(new DatabaseExecutionError('Failed to get lines by ids'))
    }
}



export async function find_ofs_games_for_user_id(user_id: UserId): Promise<Result<Game[]>> {
    try {

        let games = db.prepare(`SELECT * FROM ofs_games WHERE user_id = ?`).all(user_id) as Game[]

        return Result.ok(games)
    } catch (e) {
        return Result.err(new DatabaseExecutionError('Failed to find ofs games for user id'))
    }
}


export async function delete_many_games(games: Game[]): Promise<Result<void>> {
    try {
        const db_delete = db.prepare('DELETE FROM ofs_games WHERE id = ?')

        const deleteMany = db.transaction((data) => {
            for (const item of data) {
                db_delete.run([item.id])
            }
        })

        await deleteMany(games)

        return Result.ok(void 0)
    } catch (e) {
        return Result.err(new DatabaseExecutionError('Failed to delete many games'))
    }
}

export async function insert_many_games(user_id: UserId, games: OFS_Game_Query[]): Promise<Result<void>> {
    try {
        const insert = db.prepare(`
        INSERT INTO ofs_games (
        id, user_id, 
        best_match_line_id,
        created_at, color, 
        you, opponent, 
        time_control, 
        did_you_lose, did_you_win, ucis) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)

        const update = db.prepare(`
        UPDATE ofs_games 
        SET ofs = ?, depth = ?, did_you_deviated = ?, nb_deviation = ? 
        WHERE id = ?
        `)

        const insertMany = db.transaction((data) => {
            for (const item of data) {
                insert.run([item.id, user_id, item.best_match_line_id ?? null, item.created_at, item.color, item.you, item.opponent, item.time_control, item.did_you_lose ? 1 : 0, item.did_you_win ? 1 : 0, item.ucis])
                update.run([item.ofs, item.depth, item.did_you_deviated ? 1 : 0, item.nb_deviation, item.id])
            }
        })

        await insertMany(games)

        return Result.ok(void 0)
    } catch (e) {
        return Result.err(new DatabaseExecutionError('Failed to insert many games'))
    }
}