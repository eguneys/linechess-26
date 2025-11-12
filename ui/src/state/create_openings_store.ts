import { Result } from "@badrap/result"
import type { Color, OpeningsLine, OpeningsLineId, OpeningsPlaylist, OpeningsPlaylistId, UCIMoves } from "./types"
import { createStore } from "solid-js/store"
import { create_openings_agent } from './create_agent'
import { createAsync } from "@solidjs/router"
import { batch, createSignal } from "solid-js"

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
    playlist: SelectedPlaylistModel | undefined
    mine_playlists: OpeningsPlaylist[] | undefined
    liked_playlists: OpeningsPlaylist[] | undefined
    global_playlists: Paged<OpeningsPlaylist> | undefined
    mine_recent_playlists: OpeningsPlaylist[] | undefined
    global_recent_playlists: OpeningsPlaylist[] | undefined
    searched_playlists: Paged<OpeningsPlaylist> | undefined
    undo_action?: UndoActionModel | undefined
}

export type SetPageNavigate = -1 | 0 | 1
export type SearchTerm = string

export type OpeningsActions = {
    create_line(name: string, moves: UCIMoves, orientation: Color): Promise<Result<OpeningsLine>>
    delete_line(id: OpeningsLineId): Promise<Result<void>>
    edit_line(id: OpeningsLineId, name?: string, orientation?: Color, moves?: UCIMoves): Promise<Result<void>>
    add_line_to_playlist(id: OpeningsPlaylistId, line_id: OpeningsLineId): Promise<Result<void>>
    set_ordered_line_slots(list: OpeningsLine[]): Promise<Result<void>>
    create_playlist(name: string, line?: OpeningsLineId): Promise<Result<OpeningsPlaylist>>
    delete_playlist(id: OpeningsPlaylistId): Promise<Result<void>>
    edit_playlist(id: OpeningsPlaylistId, name?: string): Promise<Result<void>>
    like_playlist(id: OpeningsPlaylistId, yes: boolean): Promise<Result<void>>
    like_line(id: OpeningsLineId, yes: boolean): Promise<Result<void>>
    next_playlist_page(i: SetPageNavigate): void
    next_searched_lines_page(i: SetPageNavigate): void
    next_searched_playlist_page(i: SetPageNavigate): void
    set_search_lines_term(term: SearchTerm): void
    undo(): void
}



export type OpeningsStore = [OpeningsState, OpeningsActions]

export function create_openings_store(): OpeningsStore {

    let $agent = create_openings_agent()

    const [selected_playlist_id, set_selected_playlist_id] = createSignal<OpeningsPlaylistId | undefined>(undefined, { equals: false})

    const [fetch_mine_playlists, set_fetch_mine_playlists] = createSignal(true, { equals: false })
    const [fetch_liked_playlists, set_fetch_liked_playlists] = createSignal(true, { equals: false })
    const [fetch_global_playlists, set_fetch_global_playlists] = createSignal(true, { equals: false })
    const [fetch_mine_recent_playlists, set_fetch_mine_recent_playlists] = createSignal(true, { equals: false })
    const [fetch_global_recent_playlists, set_fetch_global_recent_playlists] = createSignal(true, { equals: false })
    const [fetch_searched_lines, set_fetch_searched_lines] = createSignal(false, { equals: false })
    const [fetch_searched_playlists, set_fetch_searched_playlists] = createSignal(false, { equals: false })

    const get_selected_playlist_model = createAsync<Result<SelectedPlaylistModel>>(async () => {

        let id = selected_playlist_id()

        if (id === undefined) {
            return $agent.get_working_playlist_model()
        }

        return $agent.get_selected_playlist_model(id)
    })
    const get_mine_playlists = createAsync(async () => {
        if (!fetch_mine_playlists()) {
            return Result.err(new Error('No Fetch Requested'))
        }
        return $agent.get_mine_playlists()
    })
    const get_liked_playlists = createAsync(async () => {
        if (!fetch_liked_playlists()) {
            return Result.err(new Error('No Fetch Requested'))
        }
        return $agent.get_liked_playlists()
    })
    const get_global_playlists = createAsync(async () => {
        if (!fetch_global_playlists()) {
            return Result.err(new Error('No Fetch Requested'))
        }
        return $agent.get_global_playlists()
    })
    const get_mine_recent_playlists = createAsync(async () => {
        if (!fetch_mine_recent_playlists()) {
            return Result.err(new Error('No Fetch Requested'))
        }
        return $agent.get_mine_recent_playlists()
    })
    const get_global_recent_playlists = createAsync(async () => {
        if (!fetch_global_recent_playlists()) {
            return Result.err(new Error('No Fetch Requested'))
        }
        return $agent.get_global_recent_playlists()
    })
    const get_searched_playlists = createAsync(async () => {
        if (!fetch_searched_playlists()) {
            return Result.err(new Error('No Fetch Requested'))
        }
        return $agent.get_searched_playlists()
    })

    function update_fetch_global_playlists(_: OpeningsPlaylist) {

        if (state.global_playlists) {
            set_state('global_playlists', 'list', state.global_playlists.list.map(l => l._id === _._id ? _ : l))
        }
    }
    function update_fetch_global_recent_playlists(_: OpeningsPlaylist) {
        if (state.global_recent_playlists) {
            set_state('global_recent_playlists', state.global_recent_playlists.map(l => l._id === _._id ? _ : l))
        }
    }
    function update_fetch_mine_playlists(_: OpeningsPlaylist) {
        if (state.mine_playlists) {
            set_state('mine_playlists', state.mine_playlists.map(l => l._id === _._id ? _ : l))
        }
    }
    function update_fetch_mine_recent_playlists(_: OpeningsPlaylist) {
        if (state.mine_recent_playlists) {
            set_state('mine_recent_playlists', state.mine_recent_playlists.map(l => l._id === _._id ? _ : l))
        }
    }


    let [state, set_state] = createStore<OpeningsState>({
        get playlist() {
             return get_selected_playlist_model()?.unwrap()
        },
        get mine_playlists() {
            return get_mine_playlists()?.unwrap()
        },
        get liked_playlists() {
            return get_liked_playlists()?.unwrap()
        },
        get global_playlists() {
            return get_global_playlists()?.unwrap()
        },
        get mine_recent_playlists() {
            return get_mine_recent_playlists()?.unwrap()
        },
        get global_recent_playlists() {
            return get_global_recent_playlists()?.unwrap()
        },
        get searched_playlists() {
            return get_searched_playlists()?.unwrap()
        }
    })

    let actions: OpeningsActions = {
        create_line: async function (name: string, moves: UCIMoves, orientation: Color): Promise<Result<OpeningsLine>> {
            let playlist_id = selected_playlist_id()
            let res = await $agent.create_line(playlist_id, name, moves, orientation)

            if (res.isErr) {
                return res
            }

            await res.map(_ => {
                if (_._playlist_id === selected_playlist_id()) {

                    if (state.playlist) {
                        set_state('playlist', 'lines', state.playlist.lines.length, _)
                    }
                } else {
                    set_selected_playlist_id(_._playlist_id)
                }
            })

            return res
        },
        delete_line: async function (id: OpeningsLineId): Promise<Result<void>> {
            let res = await $agent.delete_line(id)

            if (res.isErr) {
                return res
            }


            if (state.playlist) {
                set_state('playlist', 'lines', state.playlist.lines.filter(_ => _._id !== id))
            }
            return res
        },
        edit_line: async function (id: OpeningsLineId, name?: string, orientation?: Color, moves?: UCIMoves): Promise<Result<void>> {
            let res = await $agent.edit_line(id, { name, orientation, moves })

            return res.map(_ => {
                if (state.playlist) {
                    set_state('playlist', 'lines', l => l._id === _._id, _)
                }
            })
        },
        set_ordered_line_slots: async function(lines: OpeningsLine[]): Promise<Result<void>> {
            let res = await $agent.set_ordered_line_slots(lines[0]._playlist_id, lines.map(_ => _._id))

            if (state.playlist) {
                batch(() => {
                    lines.forEach((line, i) => {
                        set_state('playlist', 'lines', _ => _._id === line._id, 'slot', i)
                    })
                })
            }
            return res.map(() => {})
        },
        add_line_to_playlist: async function (id: OpeningsPlaylistId, line_id: OpeningsLineId): Promise<Result<void>> {
            let res = await $agent.add_line_to_playlist(id, line_id)
            return res.map(_ => {
                set_selected_playlist_id(id)
                set_fetch_global_playlists(true)
                set_fetch_global_recent_playlists(true)
                set_fetch_mine_playlists(true)
                set_fetch_mine_recent_playlists(true)
            })
        },
        create_playlist: async function (name: string, line?: OpeningsLineId): Promise<Result<OpeningsPlaylist>> {
            let res = await $agent.create_playlist(name, line)

           res.map(_ => {
               set_selected_playlist_id(_._id)
               set_fetch_global_playlists(true)
               set_fetch_global_recent_playlists(true)
               set_fetch_mine_playlists(true)
               set_fetch_mine_recent_playlists(true)
           })

           return res
        },
        delete_playlist: async function (id: OpeningsPlaylistId): Promise<Result<void>> {
            let res = await $agent.delete_playlist(id)

           res.map(_ => {
               set_selected_playlist_id(undefined)
               set_fetch_global_playlists(true)
               set_fetch_global_recent_playlists(true)
               set_fetch_mine_playlists(true)
               set_fetch_mine_recent_playlists(true)
           })

            return res.map(() => {})
        },
        edit_playlist: async function (id: OpeningsPlaylistId, name?: string): Promise<Result<void>> {
            let res = await $agent.edit_playlist(id, { name })

           res.map(_ => {
               set_selected_playlist_id(undefined)
               update_fetch_global_playlists(_)
               update_fetch_global_recent_playlists(_)
               update_fetch_mine_playlists(_)
               update_fetch_mine_recent_playlists(_)
           })



            return res.map(() => {})
        },
        like_playlist: async function (id: OpeningsPlaylistId, yes: boolean): Promise<Result<void>> {
            let res = await $agent.like_playlist(id, yes)

            set_fetch_liked_playlists(true)

            if (state.playlist && state.playlist.playlist._id === id) {
                set_state('playlist', 'playlist', 'nb_likes', _ => yes ? _ + 1 : _ - 1)
            }

            return res.map(() => {})
        },
        like_line: async function (id: OpeningsLineId, yes: boolean): Promise<Result<void>> {
            let res = await $agent.like_line(id, yes)

            set_fetch_liked_playlists(true)

            if (state.playlist) {
                set_state('playlist', 'lines', _ => _._id === id, 'nb_likes', _ => yes ? _ + 1 : _ - 1)
            }

            return res.map(() => {})
        },
        next_playlist_page: async function (i: SetPageNavigate): Promise<void> {
            await $agent.next_playlist_page(i)

            set_fetch_global_playlists(true)
        },
        next_searched_lines_page: async function (i: SetPageNavigate): Promise<void> {
            await $agent.next_searched_lines_page(i)

            set_fetch_searched_lines(fetch_searched_lines())
        },
        next_searched_playlist_page: async function (i: SetPageNavigate): Promise<void> {
            await $agent.next_searched_lines_page(i)

            set_fetch_searched_playlists(fetch_searched_playlists())
        },
        set_search_lines_term: async function (term: SearchTerm): Promise<void> {
            await $agent.set_search_lines_term(term)

            set_fetch_searched_playlists(true)
            set_fetch_searched_lines(true)
        },
        undo: async function (): Promise<void> {
            await $agent.undo()

            // TODO focused refresh
            set_selected_playlist_id(selected_playlist_id())

            set_fetch_mine_playlists(true)
            set_fetch_liked_playlists(true)
            set_fetch_global_playlists(true)
            set_fetch_mine_recent_playlists(true)
            set_fetch_global_recent_playlists(true)
            set_fetch_searched_lines(false)
            set_fetch_searched_playlists(false)


            return
        }
    }

    return [state, actions]
}