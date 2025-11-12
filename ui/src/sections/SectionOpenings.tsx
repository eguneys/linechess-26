import { make_onWheel, PlayUciBoard } from '../components/PlayUciBoard'
import './SectionOpenings.scss'
import { batch, createEffect, createMemo, createSelector, createSignal, For, on, onCleanup, Show } from 'solid-js'
import { MeetButton } from '../components/MeetButton'
import ReplaySingle from '../components/ReplaySingle'
import type { Color, FEN, Key } from '@lichess-org/chessground/types'
import { fen_pos, fen_turn, steps_add_uci, steps_export_PGN, type SAN, type Step, type UCI } from '../components/steps'
import { opposite, parseSquare } from 'chessops'
import { INITIAL_FEN } from 'chessops/fen'
import SortableList from '../components/SortableList'
import DropdownMenu from '../components/DropdownMenu'
import Icon, { Icons } from '../components/Icon'
import Heart from '../components/Heart'
import ActionButton, { Actions } from '../components/ActionButton'
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '../components/ModalBlocks'
import TextInputHighlight from '../components/TextInputHighlight'
import { useStore } from '../state/OpeningsState'
import type { OpeningsLine, OpeningsPlaylist } from '../state/types'


type OpeningsBuildState = {
    fen: FEN
    turn_color: Color
    san_moves: SAN[]
    cursor: number
    last_move_uci?: UCI
    export_PGN: string
}

type OpeningsBuildActions = {
    add_uci_and_goto_it(uci: UCI): void
    goto_next_step(): void
    goto_prev_step(): void
    goto_first_step(): void
    goto_last_step(): void
    goto_set_cursor(n: number): void
    clear_steps(): void
    delete_after(): void
}


const OpeningsBuildContext = (): [OpeningsBuildState, OpeningsBuildActions] => {


    let [cursor, set_cursor] = createSignal(0)
    const [steps, set_steps] = createSignal<Step[]>([])
    const step = createMemo<Step | undefined>(() => steps()[cursor()])
    const fen = createMemo(() => step()?.fen ?? INITIAL_FEN)
    const turn_color = createMemo(() => fen_turn(fen()))
    const san_moves = createMemo(() => steps().map(_ => _.san))
    const last_move_uci = createMemo(() => step()?.uci)

    const steps_upto_cursor_moves = createMemo(() => steps().slice(0, cursor() + 1))

    const export_PGN = createMemo(() => steps_export_PGN(steps()))

    let state = {
        get cursor() {
            return cursor()
        },
        get fen() {
            return fen()
        },
        get turn_color() {
            return turn_color()
        },
        get san_moves() {
            return san_moves()
        },
        get last_move_uci() {
            return last_move_uci()
        },
        get export_PGN() {
            return export_PGN()
        }
    }

    const goto_cursor_if_exists = (n: number) => {
        if (n < 0) {
            set_cursor(-1)
        } else if (steps()[n] !== undefined) {
            set_cursor(n)
        }
    }

    let actions = {
        add_uci_and_goto_it(uci: UCI) {
            batch(() => {
                let ss = steps_upto_cursor_moves()
                let new_step = steps_add_uci(ss, uci)
                set_steps([...ss, new_step])
                set_cursor(steps().length - 1)
            })
        },

        goto_next_step() {
            goto_cursor_if_exists(cursor() + 1)
        },
        goto_prev_step() {
            goto_cursor_if_exists(cursor() - 1)
        },
        goto_first_step() {
            goto_cursor_if_exists(0)
        },
        goto_last_step() {
            goto_cursor_if_exists(steps().length - 1)
        },
        goto_set_cursor(n: number) {
            goto_cursor_if_exists(n)
        },
        clear_steps() {
            set_steps([])
            set_cursor(0)
        },
        delete_after() {
            set_steps(steps_upto_cursor_moves())
        }

    }

    return [state, actions]

}


export const SectionOpenings = () => {

    let [obs, {

        add_uci_and_goto_it,
        goto_next_step,
        goto_prev_step,
        goto_set_cursor,
        clear_steps,
        delete_after
    }] = OpeningsBuildContext()

    //"b1c3 b8c6 c3b1 c6b8 ".repeat(30).trim().split(" ").forEach(add_uci_and_goto_it)

    const play_orig_key = (orig: Key, dest: Key) => {

        let uci = orig + dest

        { // uci auto promote to queen
            let position = fen_pos(obs.fen)
            let turn_color = position.turn
            let piece = position.board.get(parseSquare(orig)!)!
            if (piece.role === 'pawn' &&
                ((dest[1] === '8' && turn_color === 'white') || (dest[1] === '1' && turn_color === 'black'))) {
                uci += 'q'
            }
        }

        add_uci_and_goto_it(uci)
    }

    const set_on_wheel_board = (delta: number) => {
        if (delta < 0) {
            goto_prev_step()
        } else {
            goto_next_step()
        }
    }

    let [orientation, set_orientation] = createSignal<Color>('white')

    const on_flip = () => {
        set_orientation(opposite(orientation()))
    }

    const [copied, set_copied] = createSignal(false)
    const Copy = createMemo(() => copied() ? 'Copied!': 'Copy')
    const on_copy_steps = async () => {
        await navigator.clipboard.writeText(obs.export_PGN)
        set_copied(true)
        await new Promise(resolve => setTimeout(resolve, 1000))
        set_copied(false)
    }

    return (<>
    <div class='openings'>
        <div class='build'>
            <h3>Build</h3>
            <div class='board-wrap'>
                <div class='board' on:wheel={{ handleEvent: make_onWheel(set_on_wheel_board), passive: false }}>
                    <PlayUciBoard fen={obs.fen} play_orig_key={play_orig_key} turn_color={obs.turn_color} movable_color={obs.turn_color} orientation={orientation()} last_move_uci={obs.last_move_uci} />
                </div>
            </div>
            <div class='board-tools'>
                <a onClick={on_flip}>Flip</a>
            </div>
        </div>
        <div class='explore'>
            <h3>Explore</h3>
            <div class='replay-wrap'>
                    <ReplaySingle fallback={<>
                        <span>Play an opening line to save it.</span>
                    </>} san_moves={obs.san_moves} cursor={obs.cursor} on_set_cursor={goto_set_cursor} />
                <div class='replay-tools'>
                    <a onClick={on_copy_steps}>{Copy()}</a>
                    <a onClick={clear_steps}>Clear</a>
                    <a onClick={delete_after}>Delete after</a>
                </div>
            </div>


            <div class='tools'>
                <TextInputHighlight size={30} on_keyup={() => {}} placeholder="Opening Line Name"></TextInputHighlight>
                <div class='action'>
                <MeetButton meet={true}>Save</MeetButton>
            <Modal
                close_on_click_outside={true}
                portal_selector={document.querySelector('.modal-portal')!}>
                {({ toggle, set_hold_close_outside }) =>
                    <>
                        <a onClick={() => toggle(true)}><small>+ Add to Playlist</small></a>
                        <AddToPlaylistModalContent toggle={toggle} set_hold_close_outside={set_hold_close_outside} />
                    </>
                }</Modal>
                </div>
            </div>
        </div>
            <OpeningsPlaylistView />
        </div>
    </>)
}

type PlaylistFilter = 'mine' | 'liked' | 'global'

const OpeningsPlaylistView = () => {

    let [state] = useStore()
    const selected_playlist = createMemo(() => state.playlist?.playlist)


    const [filter, set_filter] = createSignal<PlaylistFilter>('mine')

    const is_active = createSelector(filter)

    return (<>
        <div class='playlist'>

            <h3>Playlist</h3>
            <div class='filters'>
                <div onClick={_ => set_filter('mine')} class="tab" classList={{active: is_active('mine')}}>Mine</div>
                <div onClick={_ => set_filter('liked')} class="tab" classList={{active: is_active('liked')}}>Liked</div>
                <div onClick={_ => set_filter('global')} class="tab" classList={{active: is_active('global')}}>Global</div>
            </div>
            <div class='lists'>
                <OpeningPlaylistsView show_create_playlist={filter() === 'mine'}/>
            </div>
            <div class='info'>
                <Show when={selected_playlist()} fallback={
                    <span class='no-playlist'>Please Select a Playlist</span>
                }>{ playlist=> 
                    <PlaylistInfo playlist={playlist()} />
                }</Show>
            </div>
            <div class='lines'>
                <OpeningLines />
            </div>
        </div>
        <div class="sortable-list-portal"></div>
        <div class="dropdown-menu-portal"></div>
        <div class="modal-portal"></div>
    </>)

}

const OpeningPlaylistsView = (props: { show_create_playlist: boolean }) => {

    let [state] = useStore()

    const playlist = createMemo(() =>
        state.global_playlists?.list
    )

    return (<>
        <ul>
            <Show when={props.show_create_playlist}>
                <Modal
                    close_on_click_outside={true}
                    portal_selector={document.querySelector('.modal-portal')!}>
                    {({ open, toggle }) =>
                        <>

                            <li onClick={() => toggle(true)} class='item-new'>
                                <div class='icon'>+</div>
                                <div class='title'>Create New Playlist</div>
                            </li>
                            <CreateNewPlaylistModalContent open={open} toggle={toggle} />
                        </>
                    }</Modal>
            </Show>
            <For each={playlist()}>{item =>
                <li class='item'>
                    <div class='title'>{item.name}</div>
                    <div class='likes'>{item.nb_likes} <Icon icon={Icons.HeartFilled}></Icon></div>
                    <div class='nb'>{item.nb_lines} lines</div>
                </li>
            }</For>
        </ul>
    </>)
}

const OpeningLines = () => {

    let [state] = useStore()
    const lines = createMemo(() => state.playlist?.lines)

    return (<>
        <Show when={lines()} fallback={
            <span class='no-lines'>No Lines here. Let's add some lines.</span>
        }>{lines =>
            <SortableList
                swap_item={() => { }}
                children={OpeningPlayListItem}
                dragging={OpeningPlayListItemDragging}
                portal_selector={document.querySelector('.sortable-list-portal')!}
                list={lines()} />
            }</Show>
    </>)
}

const PlaylistInfo = (props: { playlist: OpeningsPlaylist }) => {

    const [is_edit_playlist_item_modal_open, set_is_edit_playlist_item_modal_open] = createSignal(false, { equals: false })

    return (<>
        <div class='title'>{props.playlist.name}</div>
        <div class='more'>
            <Heart nb_heart={props.playlist.nb_likes} is_heart={false} on_heart={() => { }} />
            <DropdownMenu
                portal_selector={document.querySelector('.dropdown-menu-portal')!}
                button={
                    <Icon icon={Icons.Gear} />
                }>
                <ul>
                    <li>
                        <div onClick={() => set_is_edit_playlist_item_modal_open(true)}>
                            Edit <Icon icon={Icons.Gears}></Icon>
                        </div>
                    </li>
                    <li class='red'>Delete <Icon icon={Icons.Delete}></Icon></li>
                </ul>
            </DropdownMenu>
            <Modal
                close_on_click_outside={true}
                open={is_edit_playlist_item_modal_open()}
                portal_selector={document.querySelector('.modal-portal')!}>
                {({ toggle }) =>
                    <>

                        <EditPlaylistItemModalContent toggle={toggle} />
                    </>
                }</Modal>
        </div>
    </>)
}


const OpeningPlayListItem = (item: OpeningsLine) => {

    const [is_edit_line_modal_open, set_is_edit_line_modal_open] = createSignal(false, { equals: false })

    return (<>
    <div class='a-line'>
        <span class='name'>{item.name}</span>
        <div class='more'>

                <DropdownMenu
                portal_selector={document.querySelector('.dropdown-menu-portal')!}
                button={
                    <Icon icon={Icons.Gear}/>
                }>
                <ul>
                    <li>
                    <div onClick={() => set_is_edit_line_modal_open(true)}>
                        Edit <Icon icon={Icons.Gears}></Icon>
                    </div>
                    </li>
                    <li class='red'>Delete <Icon icon={Icons.Delete}></Icon></li>
                </ul>
            </DropdownMenu>
        </div>
            <Modal
                close_on_click_outside={true}
                open={is_edit_line_modal_open()}
                portal_selector={document.querySelector('.modal-portal')!}>
                {({ toggle }) =>
                    <>

                        <EditLineModalContent toggle={toggle} />
                    </>
                }</Modal>
    </div>
    </>)
}

const OpeningPlayListItemDragging = (item: OpeningsLine) => {
    return (<>
        <div class='number2'>{item.name} woop woop!</div>
    </>)
}

const EditLineModalContent = (props: { toggle: (open?: boolean) => void }) => {


    const on_line_name_changed = (value: string, is_submit: boolean) => {
        if (is_submit) {
            console.log(value)
            props.toggle(false)
        }

    }

    return (<>
        <ModalContent>
            <ModalHeader>
                <h3>Edit Line</h3> 

            </ModalHeader>
            <ModalBody>
                <TextInputHighlight placeholder="Line Name" on_keyup={on_line_name_changed}/>
            </ModalBody>
            <ModalFooter>
                <ActionButton action={Actions.Cancel} onClick={() => props.toggle(false)}>
                    Cancel
                </ActionButton>
                <ActionButton action={Actions.Ok} onClick={() => props.toggle(false)}>
                    Ok
                </ActionButton>
            </ModalFooter>
        </ModalContent>
    </>)
}




const EditPlaylistItemModalContent = (props: { toggle: (open?: boolean) => void }) => {


    const on_playlist_name_changed = (value: string, is_submit: boolean) => {
        if (is_submit) {
            console.log(value)
            props.toggle(false)
        }

    }

    return (<>
        <ModalContent>
            <ModalHeader>
                <h3>Edit Playlist</h3> 

            </ModalHeader>
            <ModalBody>
                <TextInputHighlight placeholder="Playlist Name" on_keyup={on_playlist_name_changed}/>
            </ModalBody>
            <ModalFooter>
                <ActionButton action={Actions.Cancel} onClick={() => props.toggle(false)}>
                    Cancel
                </ActionButton>
                <ActionButton action={Actions.Ok} onClick={() => props.toggle(false)}>
                    Ok
                </ActionButton>
            </ModalFooter>
        </ModalContent>
    </>)
}


const CreateNewPlaylistModalContent = (props: { open: () => boolean, toggle: (open?: boolean) => void }) => {

    let [error, set_error] = createSignal<string | undefined>(undefined)
    let [waiting, set_waiting] = createSignal(false)
    let [, { create_playlist }] = useStore()

    let submit_value: string

    const on_playlist_name_changed = async (value: string, is_submit: boolean) => {
        submit_value = value
        if (is_submit) {
            submit()
        }
    }

    const submit = async () => {
        set_waiting(true)
        set_error(undefined)

        let res = await create_playlist(submit_value)

        if (res.isOk) {
            props.toggle(false)
        } else if (res.isErr) {

            console.error(res.error)
            set_error(res.error.message ?? 'Something went wrong.')
        }

        set_waiting(false)
    }

    createEffect(on(props.open, is_open => {
        if (!is_open) {
            set_error(undefined)
            set_waiting(false)
        }
    }))

    return (<>
        <ModalContent>
            <ModalHeader>
                <h3>Create New Playlist</h3> 

            </ModalHeader>
            <ModalBody>
                <TextInputHighlight placeholder="Playlist Name" on_keyup={on_playlist_name_changed}/>
                <Show when={error()}>
                    <span class='error'>{error()}</span>
                </Show>
            </ModalBody>
            <ModalFooter>
                <ActionButton action={Actions.Cancel} onClick={() => props.toggle(false)}>
                    Cancel
                </ActionButton>
                <ActionButton waiting={waiting()} action={Actions.Ok} onClick={() => submit()}>
                    Create
                </ActionButton>
            </ModalFooter>
        </ModalContent>
    </>)
}



const AddToPlaylistModalContent = (props: { toggle: (open?: boolean) => void, set_hold_close_outside: (hold_close: boolean) => void }) => {


    const CreateNewPlaylistHoldingModalContent = (local: { 
        toggle: (open?: boolean) => void, 
        open: () => boolean }) => {

        createEffect(() => {
            props.set_hold_close_outside(local.open())
        })

        onCleanup(() => {
            props.set_hold_close_outside(false)
        })

        return (<>
            <ActionButton action={Actions.Normal} onClick={() => local.toggle(true)}>
                + New Playlist
            </ActionButton>
            <CreateNewPlaylistModalContent open={local.open} toggle={local.toggle} />
        </>)
    }


    return (<>
        <ModalContent>
            <ModalHeader>
                <h2>Add To Playlist</h2> 
                <div onClick={() => props.toggle(false)} class='close'>
                    <Icon icon={Icons.CrossX}></Icon>
                </div>
            </ModalHeader>
            <ModalBody>
                <div class='add-to-playlist-modal-body'>
                <h3>Recent</h3>
                <div class='recent'>
                </div>
                <h3>All</h3>
                <div class='all'>

                </div>
                <div class='new-playlist-float'>
                        <Modal
                            
                            close_on_click_outside={true}
                            portal_selector={document.querySelector('.modal-portal')!}>
                            {({ open, toggle }) =>
                                <>
                                    <CreateNewPlaylistHoldingModalContent toggle={toggle} open={open} />
                                </>
                            }</Modal>

                </div>
                </div>
            </ModalBody>
        </ModalContent>
    </>)
}