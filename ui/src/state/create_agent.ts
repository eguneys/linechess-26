import { Result } from "@badrap/result";
import type { Color, OpeningsLine, OpeningsPlaylist } from "./types"
import type { Paged, SelectedPlaylistModel } from "./create_openings_store";

export type OpeningsAgent = {
    get_searched_playlists(): Promise<Result<Paged<OpeningsPlaylist>>>;
    get_global_recent_playlists(): Promise<Result<OpeningsPlaylist[]>>;
    get_mine_recent_playlists(): Promise<Result<OpeningsPlaylist[]>>;
    get_liked_playlists(): Promise<Result<OpeningsPlaylist[]>>;
    get_global_playlists(): Promise<Result<Paged<OpeningsPlaylist>>>;
    get_mine_playlists(): Promise<Result<OpeningsPlaylist[]>>;
    get_selected_playlist_model(id: string): Promise<Result<SelectedPlaylistModel>>;
    get_working_playlist_model(): Promise<Result<SelectedPlaylistModel>>;
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
    create_line(id: string | undefined, name: string, moves: string, orientation: string): Promise<Result<OpeningsLine>>
    set_ordered_line_slots(id: string, lines: string[]): Promise<Result<void>>;
}

const API_ENDPOINT = import.meta.env.DEV ? 'http://localhost:3300' : `https://api.linechess.com:3300`
const $ = (path: string, opts?: RequestInit) => fetch(API_ENDPOINT + path, { ...opts, credentials: 'include' }).then(_ => _.json())

async function $post(path: string, body: any = {}) {
    const res = await $(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    }).catch(err => new FetchError(err))
    return res
}

const $init_session = $('/session/init')
const $$ = (path: string, opts?: RequestInit) => $init_session.then(() => $(path, opts))
const $$post = (path: string, body: any = {}) => $init_session.then(() => $post(path, body))

class FetchError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FetchError';
    }
}

const wrap_result = (_: any) => {
    if (_ instanceof Error) {
        return Result.err(_)
    } else if (typeof _ === 'object' && _.errors !== undefined) {
        return Result.err(_.errors)
    } else if(typeof _ === 'object' && _.ok === true) {
        return Result.ok(_.data)
    } else {
        return Result.ok(_)
    }
}

export function create_openings_agent(): OpeningsAgent {

    return {

        undo: function(): Promise<void> {
            return $$post('/undo');
        },
        set_search_lines_term: function (term: string): Promise<void> {
            return $$post('/search', { term });
        },
        next_searched_lines_page: function (i: number): Promise<void> {
            return $$post('/search/next-page', { i });
        },
        next_playlist_page: function (i: number): Promise<void> {
            return $$post('/playlist/next-page', { i });
        },
        like_line: function (id: string, yes: boolean): Promise<Result<void>> {
            return $$post('/line/like', { id, yes }).then(wrap_result);
        },
        like_playlist: function (id: string, yes: boolean): Promise<Result<void>> {
            return $$post('/playlist/like', { id, yes }).then(wrap_result);
        },
        edit_playlist: function (id: string, body: { name: string | undefined; }): Promise<Result<OpeningsPlaylist>> {
            return $$post('/playlist/edit', { id, body }).then(wrap_result);
        },
        create_playlist: function (name: string, line: string | undefined): Promise<Result<OpeningsPlaylist>> {
            return $$post('/playlist/create', { name, line }).then(wrap_result);
        },
        delete_playlist: function (id: string): Promise<Result<void>> {
            return $$post('/playlist/delete', { id }).then(wrap_result);
        },
        add_line_to_playlist: function (id: string, line_id: string): Promise<Result<void>> {
            return $$post('/playlist/add', { id, line_id }).then(wrap_result);
        },
        delete_line: function (id: string): Promise<Result<void>> {
            return $$post('/line/delete', { id }).then(wrap_result);
        },
        edit_line: function (id: string, body: { name: string | undefined; orientation: Color | undefined; moves: string | undefined; }): Promise<Result<OpeningsLine>> {
            return $$post('/line/edit', { id, ...body }).then(wrap_result);
        },
        create_line: function (id: string | undefined, name: string, moves: string, orientation: string): Promise<Result<OpeningsLine>> {
            return $$post('/line/create', { playlist_id: id, name, moves, orientation }).then(wrap_result);
        },
        set_ordered_line_slots: function (playlist_id: string, lines: string[]): Promise<Result<void>> {
            return $$post('/line/set_ordered', { playlist_id, lines }).then(wrap_result)
        },
        get_searched_playlists: function () {
            return $$('/playlist/search').then(wrap_result)
        },
        get_global_recent_playlists: function () {
            return $$('/playlist/global/recent').then(wrap_result)
        },
        get_mine_recent_playlists: function () {
            return $$('/playlist/mine/recent').then(wrap_result)
        },
        get_global_playlists: function () {
            return $$('/playlist/global').then(wrap_result)
        },
        get_mine_playlists: function () {
            return $$('/playlist/mine').then(wrap_result)
        },
        get_liked_playlists: function () {
            return $$('/playlist/liked').then(wrap_result)
        },
        get_selected_playlist_model: function (id: string): Promise<Result<SelectedPlaylistModel>> {
            return $$(`/playlist/selected/${id}`).then(wrap_result)
        },
        get_working_playlist_model: function (): Promise<Result<SelectedPlaylistModel>> {
            return $$(`/playlist/selected`).then(wrap_result)
        },
    }
}