export type Color = 'black' | 'white'

export type FEN = string
export type SAN = string
export type UCI = string
export type UCIMoves = string



export type OpeningsLineId = `oli${string}`
export type LichessUsername = string

export type OpeningsLine = {
    _id: OpeningsLineId
    _playlist_id: OpeningsPlaylistId
    name: string
    moves: UCIMoves
    orientation: Color
    slot: number
    nb_wdl: [number, number, number]
}

export type OpeningsPlaylistId = `opi${string}`

export type OpeningsPlaylist = {
    _id: OpeningsPlaylistId
    author: LichessUsername
    name: string
    nb_likes: number
    nb_lines: number
    have_liked: boolean
}


export type TimeControl = 'bullet' | 'blitz' | 'rapid' | 'classical'

export type OFS_Stats_Query = {
  id: string
  created_at: number
  color: Color
  you: string
  opponent: string
  time_control: TimeControl
  did_you_lose: boolean
  did_you_win: boolean
  ucis: string
}

export type OFS_Stats_Query_With_Stats = (OFS_Stats_Query & OFS_Stats)

export type OFS_Stats_Result = {
  pages: OFS_Stats_Query_With_Stats[],
  lines: OFS_Line_Model_Light[]
}

export type OFS_Stats = {
  ofs: number
  depth: number
  did_you_deviated: boolean
  nb_deviation: number
  best_match_line_id: OpeningsLineId
}


export type OFS_Line_Model_Light = {
  id: OpeningsLineId
  playlist_id: OpeningsPlaylistId
  name: string
  playlist_name: string
  moves: UCIMoves
  orientation: Color
  slot: number
  /*nb_wdl: [number, number, number]*/
}