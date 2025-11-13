import { make_onWheel, PlayUciBoard } from '../components/PlayUciBoard'
import './SectionOpenings.scss'
import { createEffect, createMemo, createSelector, createSignal, For, on, onCleanup, onMount, Show, } from 'solid-js'
import { MeetButton } from '../components/MeetButton'
import ReplaySingle from '../components/ReplaySingle'
import type { Color, Key } from '@lichess-org/chessground/types'
import { fen_pos } from '../components/steps'
import { opposite, parseSquare } from 'chessops'
import SortableList from '../components/SortableList'
import DropdownMenu from '../components/DropdownMenu'
import Icon, { Icons } from '../components/Icon'
import Heart from '../components/Heart'
import ActionButton, { Actions } from '../components/ActionButton'
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '../components/ModalBlocks'
import TextInputHighlight from '../components/TextInputHighlight'
import { useStore } from '../state/OpeningsState'
import type { OpeningsLine, OpeningsPlaylist } from '../state/types'
import { Dynamic } from 'solid-js/web'
import { useBuildStore } from '../state/OpeningsBuildState'
import ErrorLine from '../components/ErrorLine'
import type { SelectedPlaylistModel } from '../state/create_openings_store'



export const SectionOpenings = () => {

    let [obs, {
        add_uci_and_goto_it,
        goto_next_step,
        goto_prev_step,
        goto_set_cursor,
        clear_steps,
        delete_after
    }] = useBuildStore()

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


    let line_name: string

    const on_line_name_changed = (value: string, _is_submit: boolean) => {
        line_name = value
    }

    const [error, _set_error] = createSignal<string | undefined>(undefined)
    const [line_name_value, set_line_name_value] = createSignal('', { equals: false })

    const set_error = (err: string) => {
        _set_error(err)

        setTimeout(() => {
            _set_error(undefined)
        }, 2000)
    }

    const [state,{create_line}] = useStore()
    const on_save_line = async () => {

        if (line_name === undefined || line_name.length < 3) {
            set_error('Opening Line Name must be at least 3 characters long.')
            return
        }

        let name = line_name
        let moves = obs.export_UCI

        if (moves.split(' ').length < 3) {
            set_error('You should play at least 3 moves.')
            return
        }

        await create_line(name, moves, orientation())
        set_line_name_value('')
        line_name = ''
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
            <div class='line-info-wrap'>
                    <Show when={state.selected_line} fallback={<>
                        <span class='no-line'>No Line Selected</span>
                        </>}>{line =>
                        <SelectedLineInfo line={line()} playlist={state.playlist!} />
                    }</Show>
            </div>
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


            <div class='error-info'>
                &nbsp;<ErrorLine error={error()}/>
            </div>
            <div class='tools'>
                <TextInputHighlight value={line_name_value()} size={30} on_keyup={on_line_name_changed} placeholder="Opening Line Name"></TextInputHighlight>
                <div class='action'>
                <MeetButton meet={true} onClick={on_save_line}>Save</MeetButton>
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

const SelectedLineInfo = (props: { line: OpeningsLine, playlist: SelectedPlaylistModel }) => {
    return (<>
        <div class='line-info'>
            <div class='playlist-info'>
                <span class='name'>{props.playlist.playlist.name}</span>
                by
                <span class='author'>{props.playlist.playlist.author ?? 'You'}</span>
            </div>
            <span class='line'>{props.line.name}</span>
        </div>
    </>)
}

type PlaylistFilter = 'mine' | 'liked' | 'global'

const OpeningsPlaylistView = () => {

    let [state] = useStore()
    const selected_playlist = createMemo(() => state.playlist)


    const [filter, set_filter] = createSignal<PlaylistFilter>('mine')

    const is_active = createSelector(filter)

    const filters = {
        mine: OpeningPlaylistsMineView,
        liked: OpeningPlaylistsLikedView,
        global: OpeningPlaylistsGlobalView
    }

    return (<>
        <div class='playlist'>

            <h3>Playlist</h3>
            <div class='filters'>
                <div onClick={_ => set_filter('mine')} class="tab" classList={{active: is_active('mine')}}>Mine</div>
                <div onClick={_ => set_filter('liked')} class="tab" classList={{active: is_active('liked')}}>Liked</div>
                <div onClick={_ => set_filter('global')} class="tab" classList={{active: is_active('global')}}>Global</div>
            </div>
            <div class='lists'>
                <Dynamic component={filters[filter()]}></Dynamic>
            </div>
            <div class='info'>
                <Show when={selected_playlist()} fallback={
                    <span class='no-playlist'>Please Select a Playlist</span>
                }>{ playlist=> 
                    <PlaylistInfo playlist={playlist().playlist} />
                }</Show>
            </div>
            <div class='lines'>
                <Show when={selected_playlist()}>{ playlist =>
                    <OpeningLines lines={playlist().lines}/>
                }</Show>
            </div>
        </div>
        <div class="sortable-list-portal"></div>
        <div class="dropdown-menu-portal"></div>
        <div class="modal-portal"></div>
    </>)

}

const OpeningPlaylistsGlobalView = () => {

    let [state] = useStore()

    const playlists = createMemo(() => state.global_playlists?.list ?? [])

    return (<>
        <ul>
            <For each={playlists()}>{item =>
                <PlaylistListItem item={item} />
            }</For>
        </ul>
    </>)
}



const OpeningPlaylistsLikedView = () => {

    let [state] = useStore()

    const playlists = createMemo(() => state.liked_playlists?.list)

    return (<>
        <ul>
            <For each={playlists()}>{item =>
                <PlaylistListItem item={item} />
            }</For>
        </ul>
    </>)
}

const OpeningPlaylistsMineView = () => {

    let [state] = useStore()

    const playlists = createMemo(() => state.mine_playlists?.list)

    return (<>
        <ul>
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
            <For each={playlists()}>{item =>
                <PlaylistListItem item={item} />
            }</For>
        </ul>
    </>)
}

const PlaylistListItem = (props: { item: OpeningsPlaylist }) => {
    const [state,{ select_playlist}] = useStore()

    const item = createMemo(() => props.item)

    const is_selected = createMemo(() => state.playlist?.playlist._id === props.item._id)

    onMount(() => {
        Utility_ScrollIntoView(is_selected, $!, 'lists')
    })

    let $: HTMLLIElement | undefined

    return (<>
        <li ref={$} onClick={() => select_playlist(props.item._id)} class='item' classList={{active: is_selected()}}>
            <div class='title'>{item().name}</div>
            <div class='likes'>{item().nb_likes} <Icon icon={Icons.HeartFilled}></Icon></div>
            <div class='nb'>{item().nb_lines} lines</div>
        </li>
    </>)
}

const OpeningLines = (props: {lines: OpeningsLine[]}) => {

    let [,{ set_ordered_line_slots }] = useStore()
    const lines = createMemo(() => props.lines.slice(0).sort((a, b) => a.slot - b.slot))

    return (<>
        <Show when={lines()} fallback={
            <span class='no-lines'>No Lines here. Let's add some lines.</span>
        }>{lines =>
            <SortableList
                set_ordered={set_ordered_line_slots}
                children={OpeningPlayListItem}
                dragging={OpeningPlayListItemDragging}
                portal_selector={document.querySelector('.sortable-list-portal')!}
                list={lines()} />
            }</Show>
    </>)
}

const PlaylistInfo = (props: { playlist: OpeningsPlaylist }) => {

    const [, { like_playlist, delete_playlist }] = useStore()
    const [is_edit_playlist_item_modal_open, set_is_edit_playlist_item_modal_open] = createSignal(false, { equals: false })

    return (<>
        <div class='title'>{props.playlist.name}</div>
        <div class='more'>
            <Heart nb_heart={props.playlist.nb_likes} is_heart={props.playlist.have_liked} on_heart={yes => like_playlist(props.playlist._id, yes)} />
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
                    <li onClick={delete_playlist} class='red'>Delete <Icon icon={Icons.Delete}></Icon></li>
                </ul>
            </DropdownMenu>
            <Modal
                close_on_click_outside={true}
                open={is_edit_playlist_item_modal_open()}
                portal_selector={document.querySelector('.modal-portal')!}>
                {({ open, toggle }) =>
                    <>

                        <EditPlaylistItemModalContent playlist={props.playlist} toggle={toggle} open={open} />
                    </>
                }</Modal>
        </div>
    </>)
}


const OpeningPlayListItem = (item: OpeningsLine) => {

    const [state,{select_line}] = useStore()

    const [is_edit_line_modal_open, set_is_edit_line_modal_open] = createSignal(false, { equals: false })

    const is_selected = createMemo(() => state.selected_line === item)

    let $: HTMLDivElement | undefined

    onMount(() => {
        Utility_ScrollIntoView(is_selected, $!, 'sortable-list-wrap')
    })

    const on_select_line = () => {
        select_line(item._id)
    }

    return (<>
    <div ref={$} onClick={on_select_line} class='a-line' classList={{active: is_selected()}}>
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




const EditPlaylistItemModalContent = (props: { playlist: OpeningsPlaylist, open: () => boolean, toggle: (open?: boolean) => void }) => {

    let [error, set_error] = createSignal<string | undefined>(undefined)
    const [, {edit_playlist }] = useStore()

    let [submit_value, set_submit_value] = createSignal('')

    const on_playlist_name_changed = (value: string, is_submit: boolean) => {
        set_submit_value(value)
        if (is_submit) {
            on_submit()
        }
    }

    const on_submit = () => {

        if (submit_value().length < 3) {
            set_error('Playlist Name must be at least 3 characters long.')
            return
        }


        set_error(undefined)


        edit_playlist(props.playlist._id, submit_value())
        props.toggle(false)
    }

    createEffect(on(props.open, is_open => {
        if (!is_open) {
            set_error(undefined)
            set_submit_value('')
        }
    }))



    return (<>
        <ModalContent>
            <ModalHeader>
                <h3>Edit Playlist</h3> 

            </ModalHeader>
            <ModalBody>
                <ErrorLine error={error()} />
                <TextInputHighlight value={submit_value()} placeholder="Playlist Name" on_keyup={on_playlist_name_changed}/>
            </ModalBody>
            <ModalFooter>
                <ActionButton action={Actions.Cancel} onClick={() => props.toggle(false)}>
                    Cancel
                </ActionButton>
                <ActionButton action={Actions.Ok} onClick={on_submit}>
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

    let [submit_value, set_submit_value] = createSignal('')

    const on_playlist_name_changed = async (value: string, is_submit: boolean) => {
        set_submit_value(value)
        if (is_submit) {
            submit()
        }
    }

    const submit = async () => {

        if (submit_value().length < 3) {
            set_error('Playlist Name must be at least 3 characters long.')
            return
        }


        set_waiting(true)
        set_error(undefined)

        let res = await create_playlist(submit_value())

        if (res.isOk) {
            props.toggle(false)
        } else if (res.isErr) {
            set_error(res.error.message ?? 'Something went wrong.')
        }

        set_waiting(false)
    }

    createEffect(on(props.open, is_open => {
        if (!is_open) {
            set_error(undefined)
            set_waiting(false)
            set_submit_value('')
        }
    }))

    return (<>
        <ModalContent>
            <ModalHeader>
                <h3>Create New Playlist</h3> 

            </ModalHeader>
            <ModalBody>
                <TextInputHighlight value={submit_value()} placeholder="Playlist Name" on_keyup={on_playlist_name_changed}/>
                <ErrorLine error={error()} />
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





const Utility_ScrollIntoView = (is_selected: () => boolean, $: HTMLElement, container_klass: string) => {


    const find_scrollable_parent = () => {

        let res: HTMLElement | null | undefined = $.parentElement

        while (res !== undefined) {
            if (res?.classList.contains(container_klass)) {
                return res
            }
            res = res?.parentElement
        }
        return res
    }

    createEffect(on(is_selected, (is_selected) => {
        if ($ !== undefined && is_selected) {
            const container = find_scrollable_parent()
            if (!container) {
                return
            }

            /*https://stackoverflow.com/questions/73379182/trying-to-scroll-into-view-a-nested-scrollbar-elements-child*/
    let parent = container
    let child = $
  // Where is the parent on page
  var parentRect = parent.getBoundingClientRect();
  // What can you see?
  var parentViewableArea = {
    height: parent.clientHeight,
    width: parent.clientWidth
  };

  // Where is the child
  var childRect = child.getBoundingClientRect();
  // Is the child viewable?
            var isViewable = (childRect.top >= parentRect.top) && (childRect.bottom <= parentRect.top + parentViewableArea.height);
            
            if (!isViewable) {
            container.scroll({
                top: $.offsetTop,
                behavior: 'smooth'
            })
        }
        }

    }))
}