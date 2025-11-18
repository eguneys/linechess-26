import { createStore } from "solid-js/store"
import { createAsync } from "@solidjs/router"
import { create_lichess_agent, type exportGameResponse } from "./create_lichess_agent"
import type { OpeningsStore2 } from "./OpeningsStore2"
import { createSignal, untrack } from "solid-js"
import type { Color, OFS_Stats_Query, OFS_Stats_Result, TimeControl } from "./types"
import { opposite } from "@lichess-org/chessground/util"
import { sans_to_ucis } from "../logic/chess"
import { makePersisted } from "@solid-primitives/storage"


export type LichessState = {
    username: string | undefined
    daily_ofs_stats: OFS_Stats_Result | undefined
}

export type LichessActions = {
    logout: () => void
}

export type LichessApiStore = [LichessState, LichessActions]


export function create_lichess_api(store: OpeningsStore2): LichessApiStore {

    const [, { get_lichess_token, post_ofs_stats_batched }] = store.openings

    let $agent = createAsync(async () => {

      let hasToken = await get_lichess_token()

      return hasToken.map(_ => {
        let $agent = create_lichess_agent(_.token)
        return $agent
      }).unwrap()
    })

    const username = createAsync<string>(async () => {
        return $agent()?.fetch_username()
    })


    let today = new Date()
    today.setHours(0, 0, 0, 0)
    //let [fetch_games_since, set_fetch_games_since] = createSignal(today.getTime())
    let [fetch_games_since, set_fetch_games_since] = makePersisted(createSignal(today.getTime()), {
      name: '.linechess.games_since'
    })

    const [fetch_games_ticker, set_fetch_games_ticker] = createSignal(undefined, { equals: false })

    setInterval(set_fetch_games_ticker, 10 * 60 * 1000)

    let games = createAsync(async () => {
      fetch_games_ticker()
      let $ = $agent()
      let u = username()

      if ($ && u) {
        let res = await $.fetch_games(u, untrack(() => fetch_games_since()))

        set_fetch_games_since(new Date().getTime())
        return res
      }
    })


    let get_daily_ofs_stats = createAsync(async () => {
      let u = username()

      let gg = await games()

      if (u === undefined || gg === undefined) {
        return
      }

      let res = gg.map(_ => make_ofs_stats_query(u, _))

      return post_ofs_stats_batched(res)
    })


  let [state, _set_state] = createStore({
    get daily_ofs_stats() {
      return get_daily_ofs_stats()?.unwrap()
    },
    get username() {
        return username()
    }
  })

  const [,{ profile_logout}] = store.openings

  const logout = async () => {

    profile_logout()
  }

  let actions = {
    logout
  }

  return [state, actions]

}

function make_ofs_stats_query(username: string, game: exportGameResponse): OFS_Stats_Query {

  let color: Color = game.players['black'].user.name === username ? 'black' : 'white'

  let ucis = sans_to_ucis(game.moves.split(' ')).join(' ')

  return {
    id: game.id,
    created_at: game.createdAt,
    color,
    you: game.players[color].user.name,
    opponent: game.players[opposite(color)].user.name,
    time_control: game.speed as TimeControl,
    did_you_lose: game.winner === opposite(color),
    did_you_win: game.winner === color,
    ucis
  }
}