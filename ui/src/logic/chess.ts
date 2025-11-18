import { INITIAL_FEN } from "chessops/fen";
import { fen_pos, type SAN, type UCI } from "../components/steps";
import { makeSan, parseSan } from "chessops/san";
import { makeUci, parseUci } from "chessops";

export function sans_to_ucis(sans: SAN[]): UCI[] {
    let fen = INITIAL_FEN

    let pos = fen_pos(fen)
    let res = []

    for (let san of sans) {
        let move = parseSan(pos, san)!

        let uci = makeUci(move)
        res.push(uci)

        pos.play(move)
    }

    return res
}



export function ucis_to_sans(ucis: UCI[]): SAN[] {
    let fen = INITIAL_FEN

    let pos = fen_pos(fen)
    let res = []

    for (let uci of ucis) {
        let move = parseUci(uci)!

        let san = makeSan(pos, move)
        res.push(san)

        pos.play(move)
    }

    return res
}