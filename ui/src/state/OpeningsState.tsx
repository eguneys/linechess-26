import type { Result } from "@badrap/result"
import type { Color, OpeningsLine, OpeningsLineId, OpeningsPlaylist, OpeningsPlaylistId, UCIMoves } from "./types"

export interface Paged<Content> {
    max_per_page: number
    nb_pages: number
    page: number
    list: Content[]
}

export type SelectedPlaylistModel = {
    playlist: OpeningsPlaylist,
    lines: OpeningsLine[]
}

export type OpeningsLineModel = OpeningsLine & {
    is_dirty: boolean
}

export type UndoableActionCommand = 'delete-playlist' | 'delete-line-from-playlist'

export type UndoActionModel = {
    last_command: UndoableActionCommand
}

export type OpeningsState = {
    playlist: SelectedPlaylistModel
    mine_playlists: OpeningsPlaylist[]
    liked_playlists: OpeningsPlaylist[]
    global_playlists: Paged<OpeningsPlaylist>
    mine_recent_playlists: OpeningsPlaylist[]
    global_recent_playlists: OpeningsPlaylist[]
    searched_lines: Paged<OpeningsLine>
    searched_playlists: Paged<OpeningsPlaylist>
    undo_action?: UndoActionModel
}

export type SetPageNavigate = -1 | 0 | 1
export type SearchTerm = string

export type OpeningsActions = {
    create_line(id: OpeningsPlaylistId, name: string, moves: UCIMoves, orientation: Color): Promise<Result<OpeningsLine>>
    delete_line(id: OpeningsLineId): Promise<Result<void>>
    edit_line(id: OpeningsLineId, name?: string, orientation?: Color, moves?: UCIMoves): Promise<Result<void>>
    add_line_to_playlist(id: OpeningsPlaylistId, line_id: OpeningsLineId): Promise<Result<void>>
    create_playlist(name: string, line?: OpeningsLineId): Promise<Result<OpeningsPlaylist>>
    delete_playlist(id: OpeningsPlaylistId): Promise<Result<void>>
    edit_playlist(id: OpeningsPlaylistId, name?: string): Promise<Result<void>>
    like_playlist(id: OpeningsPlaylistId): Promise<Result<void>>
    like_line(id: OpeningsLineId): Promise<Result<void>>
    next_lines_page(i: SetPageNavigate): void
    next_playlist_page(i: SetPageNavigate): void
    next_searched_lines_page(i: SetPageNavigate): void
    next_searched_playlist_page(i: SetPageNavigate): void
    set_search_lines_term(term: SearchTerm): void
    undo(): void
}