import { opposite, type Color } from "chessops"
import type { FEN, SAN, UCI } from "./types"
import { batch, createMemo } from "solid-js"
import { createWritableMemo } from "@solid-primitives/memo"
import { fen_turn, steps_add_uci, steps_export_PGN, steps_export_UCI, steps_make_from_UCIs, type Step } from "../components/steps"
import { INITIAL_FEN } from "chessops/fen"
import type { OpeningsStore2 } from "./OpeningsStore2"

type OpeningsBuildState = {
    orientation: Color
    fen: FEN
    turn_color: Color
    san_moves: SAN[]
    cursor: number
    last_move_uci?: UCI
    export_PGN: string
    export_UCI: string
}

type OpeningsBuildActions = {
    flip(): void
    set_orientation(color: Color): void
    add_uci_and_goto_it(uci: UCI): void
    goto_next_step(): void
    goto_prev_step(): void
    goto_first_step(): void
    goto_last_step(): void
    goto_set_cursor(n: number): void
    clear_steps(): void
    delete_after(): void
    import_UCIs(ucis: string): void
}

export type OpeningsBuildStore = [OpeningsBuildState, OpeningsBuildActions]

export const create_build_store = (store: OpeningsStore2): OpeningsBuildStore => {

    let [ops] = store.openings

    let [orientation, set_orientation] = createWritableMemo(() => ops.selected_line?.orientation ?? 'white')


    const [steps, set_steps] = createWritableMemo(() => steps_make_from_UCIs(ops.selected_line?.moves.split(' ') ?? []))
    let [cursor, set_cursor] = createWritableMemo(() => steps().length -1)

    const step = createMemo<Step | undefined>(() => steps()[cursor()])
    const fen = createMemo(() => step()?.fen ?? INITIAL_FEN)
    const turn_color = createMemo(() => fen_turn(fen()))
    const san_moves = createMemo(() => steps().map(_ => _.san))
    const last_move_uci = createMemo(() => step()?.uci)

    const steps_upto_cursor_moves = createMemo(() => steps().slice(0, cursor() + 1))

    const export_PGN = createMemo(() => steps_export_PGN(steps()))
    const export_UCI = createMemo(() => steps_export_UCI(steps()))

    const import_UCIs = (ucis: string) => set_steps(steps_make_from_UCIs(ucis.split(' ')))

    let state = {
        get orientation() {
            return orientation()
        },
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
        },
        get export_UCI() {
            return export_UCI()
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

        flip() {
            set_orientation(opposite(orientation()))
        },
        import_UCIs,
        set_orientation,
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