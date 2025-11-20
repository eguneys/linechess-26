export type UserId = string

export type User = {
    id: UserId
    lichess_username?: string
    lichess_access_token?: string
}

export type PlaylistId = string

export type Playlist = {
    id: PlaylistId
    name: string
    author?: string
    nb_lines: number
    nb_likes: number
    created_at: number
    have_liked: ZeroOne
}

export type LineId = string

export type Line = {
    id: LineId
    playlist_id: PlaylistId
    name: string
    moves: string
    orientation: string
    slot: number
    nb_likes: number
    created_at: number
}

export type GameId = string

export type Color = 'white' | 'black'
export type TimeControl = 'bullet' | 'blitz' | 'rapid' | 'classical'
export type ZeroOne = 0 | 1
export type Ucis = string

export type Game = {
    id: GameId
    created_at: number
    color: Color
    you: string
    opponent: string
    time_control: TimeControl
    did_you_lose: ZeroOne
    did_you_win: ZeroOne
    ucis: Ucis
    ofs: number
    depth: number
    did_you_deviated: ZeroOne
    nb_deviation: number
    best_match_line_id: LineId
}




export type OFS_Game_Query = {
    id: GameId
    created_at: number
    color: Color
    you: string
    opponent: string
    time_control: TimeControl
    did_you_lose: boolean
    did_you_win: boolean
    ucis: Ucis
}

export type OFS_Game_Json = {
    id: GameId
    created_at: number
    color: Color
    you: string
    opponent: string
    time_control: TimeControl
    did_you_lose: boolean
    did_you_win: boolean
    ucis: Ucis
    ofs: number
    depth: number
    did_you_deviated: boolean
    nb_deviation: number
    best_match_line_id?: LineId
}