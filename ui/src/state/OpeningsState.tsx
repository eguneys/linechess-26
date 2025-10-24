import type { Result } from "@badrap/result"
import type { Color, OpeningsLine, OpeningsLineId, OpeningsPlaylist, OpeningsPlaylistId, UCIMoves } from "./types"

export interface Paged<Content> {
    max_per_page: number
    nb_pages: number
    page: number
    list: Content[]
    _cache: Content[][]
}

export type OpeningsState = {
    my_lines: Paged<OpeningsLine>
    my_playlists: Paged<OpeningsPlaylist>
    all_lines: Paged<OpeningsLine>
    all_playlists: Paged<OpeningsPlaylist>
    searched_lines: Paged<OpeningsLine>
    searched_playlists: Paged<OpeningsPlaylist>
}

export type SetPageNavigate = -1 | 0 | 1
export type SearchTerm = string

export type OpeningsActions = {
    add_line(name: string, moves: UCIMoves, orientation: Color): Promise<Result<OpeningsLine>>
    create_playlist(name: string, line?: OpeningsLineId): Promise<Result<OpeningsPlaylist>>
    delete_playlist(id: OpeningsPlaylistId): Promise<Result<void>>
    like_playlist(id: OpeningsPlaylistId): Promise<Result<void>>
    like_line(id: OpeningsLineId): Promise<Result<void>>
    add_line_to_playlist(id: OpeningsPlaylistId, line_id: OpeningsLineId): Promise<Result<void>>
    next_my_lines_page(i: SetPageNavigate): void
    next_my_playlist_page(i: SetPageNavigate): void
    next_lines_page(i: SetPageNavigate): void
    next_playlist_page(i: SetPageNavigate): void
    next_searched_lines_page(i: SetPageNavigate): void
    next_searched_playlist_page(i: SetPageNavigate): void
    set_search_lines_term(term: SearchTerm): void
    set_search_playlist_term(term: SearchTerm): void
    refresh(): void
}