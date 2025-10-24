export type Color = 'black' | 'white'

export type FEN = string
export type SAN = string
export type UCI = string
export type UCIMoves = string



export type OpeningsLineId = `oli${string}`
export type LichessUsername = string

export type OpeningsLine = {
    _id: OpeningsLineId
    author: LichessUsername
    name: string
    moves: UCIMoves
    orientation: Color
    nb_likes: number
    nb_saved: number
    nb_wdl: [number, number, number]
}

export type OpeningsPlaylistId = `opi${string}`

export type OpeningsPlaylist = {
    _id: OpeningsPlaylistId
    author: LichessUsername
    name: string
    lines: OpeningsLineId[]
    nb_likes: number
}