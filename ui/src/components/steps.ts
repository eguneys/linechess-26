import { Chess, parseUci } from "chessops"
import { INITIAL_FEN, makeFen, parseFen } from "chessops/fen"
import { makeSan } from "chessops/san"

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

