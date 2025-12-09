import * as repository from './repository.ts'
import { Result } from '@badrap/result'
import type { Color, GameId, Line, LineId, OFS_Game_Json, OFS_Game_Query, Playlist, PlaylistId, User, UserId } from './types.ts'
import { ofs_view_json } from './view_json.ts'
import { fill_ofs_stats, is_timestamp_in_today } from './util.ts'

export async function create_user() {
    const user = await repository.create_user()

    return user
}

export class InfrastructureError extends Error {
    name = 'InfrastructureError'
}

export class UserNotFoundError extends Error {
    constructor(id: string) {
        super(`User with ID ${id} not found.`);
        this.name = 'UserNotFoundError';
    }

}

export async function get_user_by_id(id: string) {
    const user = await repository.find_user_by_id(id)

    return user.chain(user => {
        if (!user) {
            return Result.err(new UserNotFoundError(id))
        } else {
            return Result.ok(user)
        }
    }, err => {
        return Result.err(new InfrastructureError(err.message))
    })
}

export class LichessTokenNotFoundErrorForUser extends Error {
    constructor(id: string) {
        super(`Lichess token for user with ID ${id} not found.`);
        this.name = 'LichessTokenNotFoundErrorForUser';
    }
}

export async function get_lichess_token_by_user_id(user_id: string) {
    const token = await repository.get_lichess_token_by_user_id(user_id)

    return token.chain(token => {
        if (!token || token.lichess_access_token === null) {
            return Result.err(new LichessTokenNotFoundErrorForUser(user_id))
        } else {
            return Result.ok(token)
        }
    }, err => {
        return Result.err(new InfrastructureError(err.message))
    })
}

export async function upgrade_user_to_lichess(user_id: UserId, accessToken: string, lichess_username: string): Promise<Result<User>> {


    let res = await repository.upgrade_user_to_lichess(user_id, accessToken, lichess_username)

    let res2: Result<User> = await res.unwrap(async () => {
        return await get_user_by_id(user_id)
    }, err => {
        return Result.err(new InfrastructureError(err.message))
    })

    return res2
}

export async function playlist_like(user_id: UserId, playlist_id: PlaylistId, yes: boolean): Promise<Result<void>> {

    let playlist = await repository.find_playlist_likes_by_id(user_id, playlist_id)

    let res = await playlist.unwrap(async playlist => {
        if (playlist === undefined) {
            let res = await repository.create_playlist_like(playlist_id, user_id)
            return res.map(() => {}, err => new InfrastructureError(err.message))
        } else {
            let res = await repository.update_playlist_like(playlist.id, yes)
            return res.map(() => {}, err => new InfrastructureError(err.message))
        }
    }, err => {
        return Result.err(new InfrastructureError(err.message))
    })

    return res
}

export class PlaylistNotFoundError extends Error {
    constructor(id: PlaylistId) {
        super(`Playlist with ID ${id} not found.`);
        this.name = 'PlaylistNotFoundError';
    }

}

export async function edit_playlist(user_id: UserId, id: PlaylistId, body: { name: string }): Promise<Result<Playlist>> {

    let res = await repository.update_playlist(id, body.name)

    return res.unwrap(async () => {
        return (await repository.find_playlist_by_id(id, user_id)).unwrap(playlist => {
           if (!playlist) {
               return Result.err(new PlaylistNotFoundError(id))
           } else {
               return Result.ok(playlist)
           } 
        }, err => {
            return Result.err(new InfrastructureError(err.message))
        })

    }, err => {
        return Result.err(new InfrastructureError(err.message))
    })
}


export async function create_playlist(user_id: UserId, name: string): Promise<Result<Playlist>> {

    let playlist = await repository.create_playlist(user_id, name)

    return playlist.map(_ => _, err => {
        return new InfrastructureError(err.message)
    })
}


export async function delete_playlist(id: PlaylistId) {

    let res = await repository.delete_playlist(id)

    return res.map(_ => _, err => {
        return new InfrastructureError(err.message)
    })
}

export async function delete_line(id: LineId) {

    let res = await repository.delete_line(id)

    return res.map(_ => _, err => {
        return new InfrastructureError(err.message)
    })
}

export class LineNotFoundError extends Error {
    constructor(id: LineId) {
        super(`Line with ID ${id} not found.`);
        this.name = 'LineNotFoundError';
    }
}

export async function edit_line(id: LineId, body: { name: string }): Promise<Result<Line>> {

    let res = await repository.update_line(id, body.name)

    return res.unwrap(async () => {
        return (await repository.find_line(id)).unwrap(line => {
           if (!line) {
               return Result.err(new LineNotFoundError(id))
           } else {
               return Result.ok(line)
           } 
        }, err => {
            return Result.err(new InfrastructureError(err.message))
        })

    }, err => {
        return Result.err(new InfrastructureError(err.message))
    })
}


export async function create_line(user_id: UserId, playlist_id: PlaylistId | undefined, body: { name: string, moves: string, orientation: Color }): Promise<Result<Line | undefined>> {

    let { name, moves, orientation } = body

    if (playlist_id === undefined) {
        let res = await repository.find_working_playlist_id(user_id)

        if (res.isErr) {
            return Result.err(new InfrastructureError(res.error.message))
        }

        if (res.isOk) {
            if (!res.value) {
                return Result.err(new LineNotFoundError(repository.WorkingPlaylistName))
            } else {
                playlist_id = res.value.id
            }
        }
    }

    let res = await repository.create_line(playlist_id!, name, moves, orientation)

    return res.map(_ => _, err => {
        return new InfrastructureError(err.message)
    })
}


export async function order_lines(lines: LineId[], playlist_id: PlaylistId) {

    let res = await repository.order_lines(lines, playlist_id)

    return res.map(_ => _, err => {
        return new InfrastructureError(err.message)
    })
}


export async function get_playlists_paginated(user_id: UserId, page_size: number, offset: number): Promise<Result<{count: number, playlists: Playlist[]}>> {

    let r_count = await repository.get_playlists_count()

    if (r_count.isErr) {
        return Result.err(new InfrastructureError(r_count.error.message))
    }

    let count = r_count.value


    let res = await repository.get_playlists_with_offset(user_id, page_size, offset)

    return res.map(playlists => ({ count, playlists }), err => {
        return new InfrastructureError(err.message)
    })
}


export async function get_playlists_mine(user_id: UserId) {

    let res = await repository.get_playlists_mine(user_id)

    return res.map(_ => _, err => {
        return new InfrastructureError(err.message)
    })
}


export async function get_playlists_liked(user_id: UserId) {

    let res = await repository.get_playlists_liked(user_id)

    return res.map(_ => _, err => {
        return new InfrastructureError(err.message)
    })
}


export async function get_selected_playlist(user_id: UserId): Promise<Result<{playlist: Playlist, lines: Line[]}>> {


    let res = await repository.get_or_create_working_playlist(user_id)

    let res2 : Result<{playlist: Playlist, lines: Line[]}> = await res.unwrap(async playlist => {
        let res3 = await repository.find_lines_for_playlist(playlist.id)
        
        let res4 = res3.unwrap(lines => Result.ok({
            playlist, lines
        }), err => {
            return Result.err(new InfrastructureError(err.message))
        })

        return res4
    }, err => {
        return Result.err(new InfrastructureError(err.message))
    })

    return res2
}


export async function get_playlist_by_id(playlist_id: PlaylistId, user_id: UserId) {

    let playlist = await repository.find_playlist_by_id(playlist_id, user_id)

    let res: Result<Playlist> = playlist.unwrap(playlist => {
        if (!playlist) {
            return Result.err(new PlaylistNotFoundError(playlist_id))
        } else {

            return Result.ok(playlist)
        }
    }, err => {
        return Result.err(new InfrastructureError(err.message))
    })


    let res2 : Result<{playlist: Playlist, lines: Line[]}> = await res.unwrap(async playlist => {
        let res3 = await repository.find_lines_for_playlist(playlist.id)
        
        let res4 = res3.unwrap(lines => Result.ok({
            playlist, lines
        }), err => {
            return Result.err(new InfrastructureError(err.message))
        })

        return res4
    }, err => {
        return Result.err(new InfrastructureError(err.message))
    })


    return res2
}


export async function compute_ofs_and_get_daily(user_id: UserId, query: OFS_Game_Query[]): Promise<Result<{ pages: OFS_Game_Json[], lines: Line[] }>> {


    let r_games = await repository.find_ofs_games_for_user_id(user_id)

    if (r_games.isErr) {
        return Result.err(new InfrastructureError(r_games.error.message))
    }

    let games = r_games.value

    let ids = games.map(_ => _.id)
    query = query.filter(game => !ids.includes(game.id))

    let drop_games = games.filter(game => !is_timestamp_in_today(game.created_at))

    games = games.filter(game => is_timestamp_in_today(game.created_at))

    let r_ofs_data = await repository.find_lines_as_ofs_data_for_user(user_id)

    if (r_ofs_data.isErr) {
        return Result.err(new InfrastructureError(r_ofs_data.error.message))
    }

    let ofs_data = r_ofs_data.value

    let query_filled = query.map(game => fill_ofs_stats(ofs_data, game))


    let r_del = await repository.delete_many_games(drop_games)

    if (r_del.isErr) {
        return Result.err(new InfrastructureError(r_del.error.message))
    }

    let r_ins = await repository.insert_many_games(user_id, query_filled)

    if (r_ins.isErr) {
        return Result.err(new InfrastructureError(r_ins.error.message))
    }


    let pages: OFS_Game_Json[] = [...games.map(ofs_view_json), ...query_filled]


    let line_ids = pages.map(_ => _.best_match_line_id!).filter(Boolean)

    let res = await repository.get_lines_by_ids(line_ids)
    
    return res.unwrap(lines => {
        return Result.ok({pages, lines})
    }, err => {
        return Result.err(new InfrastructureError(err.message))
    })

}