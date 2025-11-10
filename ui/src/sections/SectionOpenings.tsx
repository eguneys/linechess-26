import { make_onWheel, PlayUciBoard } from '../components/PlayUciBoard'
import './SectionOpenings.scss'
import { batch, createMemo, createSignal, For } from 'solid-js'
import { MeetButton } from '../components/MeetButton'
import ReplaySingle from '../components/ReplaySingle'
import type { Color, FEN, Key } from 'chessground/types'
import { fen_pos, fen_turn, steps_add_uci, steps_export_PGN, type SAN, type Step, type UCI } from '../components/steps'
import { opposite, parseSquare } from 'chessops'
import { INITIAL_FEN } from 'chessops/fen'
import SortableList from '../components/SortableList'
import DropdownMenu from '../components/DropdownMenu'
import Icon, { Icons } from '../components/Icon'


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


    const [playlist, _set_playlist] = createSignal("1.e4 Sicilian Defense,1.e4 e5 French Defense,1.d4 Queen's Gambit Declined,Scandinavian ".repeat(10).trim().split(','))
    const [lines, set_lines] = createSignal("1.e4 1.d4 1.f4 1.g5 ".repeat(10).trim().split(' '))

    return (<>
    <div class='openings'>
        <div class='build'>
            <h3>Build</h3>
            <div class='board-wrap'>
                <div class='board' on:wheel={{ handleEvent: make_onWheel(set_on_wheel_board), passive: true }}>
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
                <input required={true} type='text' placeholder="Opening Line Name"></input>
                <div class='action'>
                <MeetButton meet={true}>Save</MeetButton>
                <a><small>+ Add to Playlist</small></a>
                </div>
            </div>
        </div>
        <div class='playlist'>

            <h3>Playlist</h3>
            <div class='filters'>
                    <div class="tab active">Mine</div>
                    <div class="tab">Liked</div>
                    <div class="tab">Global</div>
                </div>
                <div class='lists'>
                    <ul>
                        <li class='item-new'>
                            <div class='icon'>+</div>
                            <div class='title'>Create New Playlist</div>
                        </li>
                        <For each={playlist()}>{item =>
                            <li class='item'>
                                <div class='title'>{item}</div>
                                <div class='nb'>50 lines</div>
                            </li>
                        }</For>
                    </ul>
                </div>
                <div class='info'>
                    <div class='title'>1.e4 Sicilian Defense Scandinavian Defense More Alekhine Queen's G D</div>
                    <div class='more'>
                        <DropdownMenu
                            portal_selector={document.querySelector('.dropdown-menu-portal')!}
                            button={
                                <Icon icon={Icons.Gear}/>
                            }>
                            <ul>
                                <li>Edit <Icon icon={Icons.Gears}></Icon></li>
                                <li class='red'>Delete <Icon icon={Icons.Delete}></Icon></li>
                            </ul>
                        </DropdownMenu>
                    </div>
                </div>
                <div class='lines'>
                    <SortableList
                        children={OpeningPlayListItem}
                        dragging={OpeningPlayListItemDragging}
                        portal_selector={document.querySelector('.sortable-list-portal')!}
                        list={lines()}
                        set_list={set_lines} />
                </div>

        </div>
        <div class="sortable-list-portal"></div>
        <div class="dropdown-menu-portal"></div>
    </div>
    </>)
}

const OpeningPlayListItem = (item: string) => {
    return (<>
    <div class='number'>{item}</div>
    </>)
}

const OpeningPlayListItemDragging = (item: string) => {
    return (<>
        <div class='number2'>{item} woop woop!</div>
    </>)
}