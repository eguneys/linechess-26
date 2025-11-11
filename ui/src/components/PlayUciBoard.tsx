import { Chessground } from "@lichess-org/chessground"
import type { Api } from "@lichess-org/chessground/api"
import { type DrawShape } from "@lichess-org/chessground/draw"
import type { Color, FEN, Key } from "@lichess-org/chessground/types"
import { createEffect, createMemo, onMount } from "solid-js"
import { chessgroundDests } from "chessops/compat"
import { stepwiseScroll } from "../common/scroll"
import '../assets/chessground/chessground.css'
import '../assets/chessground/cburnett.css'
import '../assets/chessground/theme.css'
import './chessground.scss'
import { Chess} from "chessops"
import { INITIAL_FEN } from "chessops/fen"
import { fen_pos, type UCI } from "./steps"

export function PlayUciBoard(props: { 
  shapes?: DrawShape[],
  orientation?: Color,
  fen?: FEN,
    movable_color?: Color,
    turn_color?: Color,
    last_move_uci: UCI | undefined, play_orig_key?: (orig: Key, dest: Key) => void }) {

    let board: HTMLDivElement
    let ground: Api

    let pos = createMemo(() => {
      try {
        return fen_pos(props.fen ?? INITIAL_FEN)
      } catch {
        return Chess.default()
      }
    })
    let dests = createMemo(() => chessgroundDests(pos()))
    let check = createMemo(() => pos().isCheck())

    onMount(() => {
      let check = pos().isCheck()

      let config = {
        fen: props.fen,
        check,
        premovable: {
          enabled: false
        },
        movable: {
          color: props.movable_color,
          free: false,
          dests: dests(),
          events: {
            after: props.play_orig_key
          }
        }
      }
      ground = Chessground(board, config)
    })


    createEffect(() => {
      let lastMove: Key[] | undefined = undefined
      if (props.last_move_uci) {
        let uci = props.last_move_uci
        lastMove = [uci.slice(0, 2) as Key, uci.slice(2, 4) as Key]
      }
      ground.set({
        lastMove,
        fen: props.fen,
        turnColor: props.turn_color,
        orientation: props.orientation ?? 'white',
        check: check(),
        movable: {
          color: props.movable_color,
          dests: dests()
        }
      }) 
    })


    createEffect(() => { ground.setAutoShapes(props.shapes ?? []) })

    return (<><div ref={(el) => board = el} class='is2d chessboard'> </div></>)
}

export const non_passive_on_wheel = (set_on_wheel: (delta: number) => void) => ({
  handleEvent: make_onWheel(set_on_wheel),
  passive: false
})

export const make_onWheel = (set_on_wheel: (delta: number) => void) => stepwiseScroll((e: WheelEvent) => {
  const target = e.target as HTMLElement;
  if (
    target.tagName !== 'PIECE' &&
    target.tagName !== 'SQUARE' &&
    target.tagName !== 'CG-BOARD'
  )
    return;
  e.preventDefault()
  set_on_wheel(Math.sign(e.deltaY))
})