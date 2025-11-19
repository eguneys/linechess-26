import { Chess, makeUci, parseUci } from "chessops"
import { INITIAL_FEN, makeFen, parseFen } from "chessops/fen"
import { makeSan, parseSan } from "chessops/san"

export type FEN = string
export type SAN = string
export type UCI = string
export const fen_pos = (fen: FEN) => Chess.fromSetup(parseFen(fen).unwrap()).unwrap()
export const fen_turn = (fen: FEN) => fen_pos(fen).turn



export type Step = {
    before_fen: FEN,
    fen: FEN,
    uci: UCI,
    san: SAN
}

export const steps_add_uci = (steps: Step[], uci: UCI) => {
    let before_fen = steps[steps.length - 1]?.fen ?? INITIAL_FEN
    let pos = fen_pos(before_fen)
    let move = parseUci(uci)!
    let san = makeSan(pos, move)
    pos.play(move)
    let fen = makeFen(pos.toSetup())

    return {
        fen,
        before_fen,
        uci,
        san
    }
}

const single_line_pgn_to_ucis = (pgn: string) => {

    let res: UCI[] = []

    let pos = fen_pos(INITIAL_FEN)

    let lines = pgn.split(' ')

    for (let line of lines) {
        let move = parseSan(pos, line)

        if (move) {
            res.push(makeUci(move))
            pos.play(move)
        }
    }

    return res
}

export const steps_make_from_PGN = (pgn: string) => {
    let steps: Step[] = []

    let ucis = single_line_pgn_to_ucis(pgn)

    ucis.map(uci => {
        steps = [...steps, steps_add_uci(steps, uci)]
    })
    return steps
}

export const steps_make_from_UCIs = (ucis: UCI[]) => {
    let steps: Step[] = []

    ucis.map(uci => {
        steps = [...steps, steps_add_uci(steps, uci)]
    })
    return steps
}

export const steps_export_UCI = (steps: Step[]) => {
    return steps.map(_ => _.uci).join(' ')
}

export const steps_export_PGN = (steps: Step[]) => {
    return steps.map((_, i) => `${ply_to_index_omit_black(i + 1)}${_.san}`).join(' ')
}

export const ply_to_index_omit_black = (ply: number) => {
    return ply % 2 === 0 ? '' : ply_to_index(ply)
}

export const ply_to_index = (ply: number) => {
    let res = Math.ceil(ply / 2)
    return `${res}.` + (ply % 2 === 0 ? '..' : '')
}

