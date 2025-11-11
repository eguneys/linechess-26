import { Result } from "@badrap/result";
import type { Color, OpeningsLine, OpeningsPlaylist } from "./types"
import type { SelectedPlaylistModel } from "./create_openings_store";

export type OpeningsAgent = {
    get_searched_lines(): any;
    get_global_playlists(): any;
    get_mine_playlists(): any;
    get_selected_playlist_model(id: string): Promise<Result<SelectedPlaylistModel>>;
    undo(): Promise<void>;
    set_search_lines_term(term: string): Promise<void>;
    next_searched_lines_page(i: number): Promise<void>;
    next_playlist_page(i: number): Promise<void>;
    like_line(id: string, yes: boolean): Promise<Result<void>>;
    like_playlist(id: string, yes: boolean): Promise<Result<void>>;
    edit_playlist(id: string, arg1: { name: string | undefined; }): Promise<Result<OpeningsPlaylist>>;
    create_playlist(name: string, line: string | undefined): Promise<Result<OpeningsPlaylist>>;
    delete_playlist(id: string): Promise<Result<void>>;
    add_line_to_playlist(id: string, line_id: string): Promise<Result<void>>;
    edit_line(id: string, arg1: { name: string | undefined; orientation: Color | undefined; moves: string | undefined }): Promise<Result<OpeningsLine>>
    delete_line(id: string): Promise<Result<void>>
    create_line(id: string, name: string, moves: string, orientation: string): Promise<Result<OpeningsLine>>
    swap_line(a: string, b: string): Promise<Result<void>>;
}

export const API_ENDPOINT = import.meta.env.DEV ? 'http://localhost:3300' : `https://api.linechess.com:3300`
export const $ = (path: string, opts?: RequestInit) => fetch(API_ENDPOINT + path, opts).then(_ => _.json())

async function $post(path: string, body: any = {}) {
    const res = await $(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    }).catch(err => console.error(err));
    return res
}

const wrap_result = (_: any) => {
    if (typeof _ === 'object' && _.errors !== undefined) {
        return Result.err(_.errors)
    } else {
        return Result.ok(_)
    }
}

export function create_openings_agent(): OpeningsAgent {

    return {
        undo: function (): Promise<void> {
            return $post('/undo');
        },
        set_search_lines_term: function (term: string): Promise<void> {
            return $post('/search', { term });
        },
        next_searched_lines_page: function (i: number): Promise<void> {
            return $post('/search/next-page', { i });
        },
        next_playlist_page: function (i: number): Promise<void> {
            return $post('/playlist/next-page', { i });
        },
        like_line: function (id: string, yes: boolean): Promise<Result<void>> {
            return $post('/line/like', { id, yes }).then(wrap_result);
        },
        like_playlist: function (id: string, yes: boolean): Promise<Result<void>> {
            return $post('/playlist/like', { id, yes }).then(wrap_result);
        },
        edit_playlist: function (id: string, body: { name: string | undefined; }): Promise<Result<OpeningsPlaylist>> {
            return $post('/playlist/edit', { id, body }).then(wrap_result);
        },
        create_playlist: function (name: string, line: string | undefined): Promise<Result<OpeningsPlaylist>> {
            return $post('/playlist/create', { name, line }).then(wrap_result);
        },
        delete_playlist: function (id: string): Promise<Result<void>> {
            return $post('/playlist/delete', { id }).then(wrap_result);
        },
        add_line_to_playlist: function (id: string, line_id: string): Promise<Result<void>> {
            return $post('/playlist/add', { id, line_id }).then(wrap_result);
        },
        delete_line: function (id: string): Promise<Result<void>> {
            return $post('/line/delete', { id }).then(wrap_result);
        },
        edit_line: function (id: string, body: { name: string | undefined; orientation: Color | undefined; moves: string | undefined; }): Promise<Result<OpeningsLine>> {
            return $post('/line/edit', { id, ...body }).then(wrap_result);
        },
        create_line: function (id: string, name: string, moves: string, orientation: string): Promise<Result<OpeningsLine>> {
            return $post('/line/create', { id, name, moves, orientation }).then(wrap_result);
        },
        swap_line: function (a: string, b: string): Promise<Result<void>> {
            return $post('/line/swap', { a, b }).then(wrap_result)
        },
        get_searched_lines: function () {
            return $('/search/line')
        },
        get_global_playlists: function () {
            return $('/playlist/global')
        },
        get_mine_playlists: function () {
            return $('/playlist/mine')
        },
        get_selected_playlist_model: function (id: string): Promise<Result<SelectedPlaylistModel>> {
            return $(`/playlist/selected/${id}`)
        },
    }
}