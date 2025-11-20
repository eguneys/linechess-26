import { Result } from "@badrap/result"
import type { Color, OFS_Stats_Query, OFS_Stats_Result, OpeningsLine, OpeningsLineId, OpeningsPlaylist, OpeningsPlaylistId, UCIMoves } from "./types"
import { createStore } from "solid-js/store"
import { create_openings_agent } from './create_agent'
import { createAsync } from "@solidjs/router"
import { batch, createSignal } from "solid-js"
import { makePersisted } from "@solid-primitives/storage"
import type { OpeningsStore2 } from "./OpeningsStore2"

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

export type UndoableActionCommand = 'delete-playlist' | 'delete-line-from-playlist'

export type UndoActionModel = {
    last_command: UndoableActionCommand
}

export type OpeningsState = {
    selected_line: OpeningsLine | undefined
    playlist: SelectedPlaylistModel | undefined
    mine_playlists: { list: OpeningsPlaylist[] } | undefined
    liked_playlists: { list: OpeningsPlaylist[] } | undefined
    global_playlists: Paged<OpeningsPlaylist> | undefined
    mine_recent_playlists: { list: OpeningsPlaylist[] } | undefined
    global_recent_playlists: { list: OpeningsPlaylist[] } | undefined
    searched_playlists: Paged<OpeningsPlaylist> | undefined
    undo_action?: UndoActionModel | undefined
}

export type SetPageNavigate = -1 | 0 | 1
export type SearchTerm = string

export type OpeningsActions = {
    post_ofs_stats_batched(query: OFS_Stats_Query[]): Promise<Result<OFS_Stats_Result>>
    profile_logout(): void
    get_lichess_token(): Promise<Result<{ token: string }>>
    select_line(id: OpeningsLineId): void
    select_playlist(id: OpeningsPlaylistId): void
    create_line(name: string, moves: UCIMoves, orientation: Color): Promise<Result<OpeningsLine>>
    delete_line(id: OpeningsLineId): Promise<Result<void>>
    edit_line(id: OpeningsLineId, name?: string, orientation?: Color, moves?: UCIMoves): Promise<Result<void>>
    add_line_to_playlist(id: OpeningsPlaylistId, line_id: OpeningsLineId): Promise<Result<void>>
    set_ordered_line_slots(list: OpeningsLine[]): Promise<Result<void>>
    create_playlist(name: string, line?: OpeningsLineId): Promise<Result<OpeningsPlaylist>>
    delete_playlist(): Promise<Result<void>>
    edit_playlist(id: OpeningsPlaylistId, name?: string): Promise<Result<void>>
    like_playlist(id: OpeningsPlaylistId, yes: boolean): Promise<Result<void>>
    next_playlist_page(i: SetPageNavigate): void
    next_searched_lines_page(i: SetPageNavigate): void
    next_searched_playlist_page(i: SetPageNavigate): void
    set_search_lines_term(term: SearchTerm): void
    undo(): void
}



export type OpeningsStore = [OpeningsState, OpeningsActions]

export function create_openings_store(store: OpeningsStore2): OpeningsStore {


    let $agent = create_openings_agent()

    const [selected_line_id, set_selected_line_id] = makePersisted(
        createSignal<OpeningsLineId | undefined>(undefined, { equals: false}), 
        { name: '.linechess.selected_line_id.v1' })

    const [selected_playlist_id, set_selected_playlist_id] = makePersisted(
        createSignal<OpeningsPlaylistId | undefined>(undefined, { equals: false}), 
        { name: '.linechess.selected_playlist_id.v1' })

    const [fetch_mine_playlists, set_fetch_mine_playlists] = createSignal(true, { equals: false })
    const [fetch_liked_playlists, set_fetch_liked_playlists] = createSignal(true, { equals: false })
    const [fetch_global_playlists, set_fetch_global_playlists] = createSignal(true, { equals: false })
    const [fetch_mine_recent_playlists, set_fetch_mine_recent_playlists] = createSignal(true, { equals: false })
    const [fetch_global_recent_playlists, set_fetch_global_recent_playlists] = createSignal(true, { equals: false })
    const [fetch_searched_lines, set_fetch_searched_lines] = createSignal(false, { equals: false })
    const [fetch_searched_playlists, set_fetch_searched_playlists] = createSignal(false, { equals: false })

    const get_selected_playlist_model = createAsync<Result<SelectedPlaylistModel>>(async () => {

        let id = selected_playlist_id()

        let res: Result<SelectedPlaylistModel>
        if (id === undefined) {
            res = await $agent.get_working_playlist_model()
            set_selected_playlist_id(res.unwrap().playlist._id)
            set_fetch_mine_playlists(true)
        } else {
            res = await $agent.get_selected_playlist_model(id)

            if (res.isErr) {
                res = await $agent.get_working_playlist_model()
                set_selected_playlist_id(res.unwrap().playlist._id)
                set_fetch_mine_playlists(true)
            }

        }

        res.map(_ => {
            let line = _.lines.find(l => l._id === selected_line_id()) ?? _.lines[0]
            set_selected_line_id(line?._id)
        })

        return res
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
        return Result.err(new Error('Not implemented'))

        if (!fetch_mine_recent_playlists()) {
            return Result.err(new Error('No Fetch Requested'))
        }
        return $agent.get_mine_recent_playlists()
    })
    const get_global_recent_playlists = createAsync(async () => {
        return Result.err(new Error('Not implemented'))
        if (!fetch_global_recent_playlists()) {
            return Result.err(new Error('No Fetch Requested'))
        }
        return $agent.get_global_recent_playlists()
    })
    const get_searched_playlists = createAsync(async () => {
        return Result.err(new Error('Not implemented'))
        if (!fetch_searched_playlists()) {
            return Result.err(new Error('No Fetch Requested'))
        }
        return $agent.get_searched_playlists()
    })

    function update_selected_playlist(_: OpeningsPlaylist) {
        if (state.playlist) {
            set_state('playlist', 'playlist', _)
        }
    }

    function update_fetch_global_playlists(_: OpeningsPlaylist) {

        if (state.global_playlists) {
            set_state('global_playlists', 'list', l => l._id === _._id, _)
        }
    }
    function update_fetch_global_recent_playlists(_: OpeningsPlaylist) {
        if (state.global_recent_playlists) {
            set_state('global_recent_playlists', 'list', l => l._id === _._id, _)
        }
    }
    function update_fetch_mine_playlists(_: OpeningsPlaylist) {
        if (state.mine_playlists) {
            set_state('mine_playlists', 'list', l => l._id === _._id, _)
        }
    }
    function update_fetch_mine_recent_playlists(_: OpeningsPlaylist) {
        if (state.mine_recent_playlists) {
            set_state('mine_recent_playlists', 'list', l => l._id === _._id, _)
        }
    }

    function update_fetchs_all_create_line(_: OpeningsPlaylistId, is_delete: boolean) {

        if (state.global_playlists) {
            set_state('global_playlists', 'list', l => l._id === _, 'nb_lines', _ => is_delete ? _ - 1 : _ + 1)
        }
        if (state.global_recent_playlists) {
            set_state('global_recent_playlists', 'list', l => l._id === _, 'nb_lines', _ => is_delete ? _ -1 : _ + 1)
        }
        if (state.mine_playlists) {
            set_state('mine_playlists', 'list', l => l._id === _, 'nb_lines', _ => is_delete ? _ -1 : _ + 1)
        }
        if (state.mine_recent_playlists) {
            set_state('mine_recent_playlists', 'list', l => l._id === _, 'nb_lines', _ => is_delete ? _ -1 : _ + 1)
        }
        if (state.liked_playlists) {
            set_state('liked_playlists', 'list', l => l._id === _, 'nb_lines', _ => is_delete ? _ -1 : _ + 1)
        }
    }


    function update_fetchs_all_likes(_: OpeningsPlaylistId, yes: boolean) {

        if (state.global_playlists) {
            set_state('global_playlists', 'list', l => l._id === _, 'nb_likes', _ => yes ? _ + 1 : _ - 1)
        }
        if (state.global_recent_playlists) {
            set_state('global_recent_playlists', 'list', l => l._id === _, 'nb_likes', _ => yes ? _ + 1 : _ - 1)
        }
        if (state.mine_playlists) {
            set_state('mine_playlists', 'list', l => l._id === _, 'nb_likes', _ => yes ? _ + 1 : _ - 1)
        }
        if (state.mine_recent_playlists) {
            set_state('mine_recent_playlists', 'list', l => l._id === _, 'nb_likes', _ => yes ? _ + 1 : _ - 1)
        }
        if (state.liked_playlists) {
            set_state('liked_playlists', 'list', l => l._id === _, 'nb_likes', _ => yes ? _ + 1 : _ - 1)
        }
    }

    let [state, set_state] = createStore<OpeningsState>({
        get selected_line() {
            let id = selected_line_id()
            return get_selected_playlist_model()?.unwrap()
                .lines.find(_ => _._id === id)
        },
        get playlist() {
             return get_selected_playlist_model()?.unwrap()
        },
        get mine_playlists() {
            let list = get_mine_playlists()?.unwrap()
            return list ? { list } : undefined
        },
        get liked_playlists() {
            let list = get_liked_playlists()?.unwrap()
            return list ? { list } : undefined
        },
        get global_playlists() {
            return get_global_playlists()?.unwrap()
        },
        get mine_recent_playlists() {
            let list = get_mine_recent_playlists()?.unwrap()
            return list ? { list } : undefined
        },
        get global_recent_playlists() {
            let list = get_global_recent_playlists()?.unwrap()
            return list ? { list } : undefined
        },
        get searched_playlists() {
            return get_searched_playlists()?.unwrap()
        }
    })

    const [fetch_lichess_token, set_fetch_lichess_token] = createSignal(undefined, { equals: false })
    const get_lichess_token = async () => {
        fetch_lichess_token()
        return await $agent.fetch_lichess_token()
    }

    let actions: OpeningsActions = {
        post_ofs_stats_batched(query: OFS_Stats_Query[]) {
            return $agent.post_ofs_stats_batched(query)
        },
        get_lichess_token,
        async profile_logout() {

            await $agent.logout()

            set_fetch_lichess_token(undefined)

            set_selected_playlist_id(undefined)

            set_fetch_mine_playlists(true)
            set_fetch_liked_playlists(true)
            set_fetch_global_playlists(true)
            set_fetch_mine_recent_playlists(true)
            set_fetch_global_recent_playlists(true)
            set_fetch_searched_lines(false)
            set_fetch_searched_playlists(false)
        },
        select_line(id: OpeningsLineId) {

            const [, { set_orientation, import_UCIs }] = store.build
            set_selected_line_id(id)
            let line = state.selected_line

            if (!line) {
                return
            }
            import_UCIs(line.moves)
            set_orientation(line.orientation)
        },
        select_playlist(id: OpeningsPlaylistId) {
            set_selected_playlist_id(id)
        },
        create_line: async function (name: string, moves: UCIMoves, orientation: Color): Promise<Result<OpeningsLine>> {
            let playlist_id = selected_playlist_id()
            let res = await $agent.create_line(playlist_id, name, moves, orientation)

            if (res.isErr) {
                return res
            }

            await res.map(_ => {
                batch(() => {
                    if (_._playlist_id === selected_playlist_id()) {

                        if (state.playlist) {
                            set_state('playlist', 'lines', state.playlist.lines.length, _)
                        }
                    } else {
                        set_selected_playlist_id(_._playlist_id)
                    }

                    set_selected_line_id(_._id)

                    update_fetchs_all_create_line(_._playlist_id, false)
                })
            })

            return res
        },
        delete_line: async function (id: OpeningsLineId): Promise<Result<void>> {

            let playlist_id = state.playlist?.lines.find(_ => _._id === id)?._playlist_id

            let res = await $agent.delete_line(id)

            if (res.isErr) {
                return res
            }

            if (playlist_id) {

                update_fetchs_all_create_line(playlist_id, true)
            }

            if (state.playlist) {
                set_state('playlist', 'lines', state.playlist.lines.filter(_ => _._id !== id))
                if (selected_line_id() === id) {
                    set_selected_line_id(state.playlist.lines[0]?._id)
                }
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
                set_selected_line_id(line_id)
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
        delete_playlist: async function (): Promise<Result<void>> {
            let id = selected_playlist_id()

            if (id === undefined) {
                return Result.err(new Error('No Playlist Selected'))
            }

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
               update_selected_playlist(_)
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
            update_fetchs_all_likes(id, yes)

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