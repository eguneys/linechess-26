import type { Game, Line, OFS_Game_Json, Playlist, User } from "./types.ts"

export function ofs_view_json(game: Game): OFS_Game_Json {
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



export function playlist_view_json(playlist: Playlist) {
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

export function line_view_json(line: Line) {
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

export function user_view_json(user: User) {
    return {
        lichess_username: user.lichess_username
    }
}

export function paginated_view_json<T>(page: number, pageSize: number, count: number, list: T[]) {
    return {
        max_per_page: pageSize,
        nb_pages: Math.ceil(count / pageSize),
        page,
        list
    }
}

