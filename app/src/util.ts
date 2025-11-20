import { computeOFS, type Deviator, type Result } from "./compute_ofs.ts"
import type { Game, Line, OFS_Game_Json, OFS_Game_Query } from "./types.ts"

export function is_timestamp_in_today(timestamp: number) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return timestamp >= today.getTime() && timestamp < tomorrow.getTime()
}



export function fill_ofs_stats(ofs_data: Line[], game: OFS_Game_Query): OFS_Game_Json {
    
    let best_match

    let game_ucis = game.ucis.split(' ')
    let nb_deviation = Math.min(30, game_ucis.length)

    while (nb_deviation > 0) {

        best_match = ofs_data.filter(str => 
            game_ucis.join(' ')
                .includes(
                    str.moves.split(' ')
                        .slice(0, nb_deviation)
                        .join(' '))
        )
            .sort((a, b) => b.moves.length - a.moves.length)[0]

        if (best_match !== undefined) {
            nb_deviation = Math.min(nb_deviation, best_match.moves.split(' ').length)
            break
        }

        nb_deviation -= 1
    }

    if (best_match === undefined) {

        let res: OFS_Game_Json = {

            ...game,
            ofs: 0,
            depth: 0,
            did_you_deviated: true,
            nb_deviation: 0
        }

        return res
    }

    let opening_moves = best_match.moves.split(' ')
    let played_moves= opening_moves.slice(0, nb_deviation)

    let all_completed = nb_deviation === opening_moves.length

    let did_you_deviated = (game.color === 'black') === (played_moves.length % 2 === 0)

    let best_match_line_id = best_match.id

    let deviator: Deviator = did_you_deviated ? 'user' : all_completed ? 'none' : 'opponent'
    let result: Result = game.did_you_win ? 'win' : (game.did_you_lose ? 'loss' : 'draw')
    let totalMoves = opening_moves.length

    let res = computeOFS({
        matchedMoves: nb_deviation,
        deviator,
        result,
        totalMoves
    })

    let ofs = res.OFS
    let depth = res.Depth

    let res2: OFS_Game_Json = {

        ...game,

        ofs,
        depth,
        did_you_deviated,
        nb_deviation,
        best_match_line_id

    }

    return res2
}

