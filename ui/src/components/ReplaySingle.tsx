import { createEffect, For, type JSX } from 'solid-js'
import './ReplaySingle.scss'
import { ply_to_index_omit_black } from './steps'

export type SAN = string

export default function ReplaySingle(props: { fallback: JSX.Element, san_moves: SAN[], cursor: number, on_set_cursor: (i: number) => void }) {


    let $moves_el: HTMLElement
    createEffect(() => {

        let cursor = props.cursor
        let cont = $moves_el.parentElement
        if (!cont) {
            return
        }

        const target = $moves_el.querySelector<HTMLElement>('.cursor')
        if (!target) {
            cont.scrollTop = cursor > 0 ? 99999 : 0
            return
        }

        let top = target.offsetTop - cont.offsetHeight / 2 + target.offsetHeight
        cont.scrollTo({ behavior: 'smooth', top })
    })

    
    return (<>
        <div class='moves-wrap'>
            <ul ref={_ => $moves_el = _} class='replay'><For fallback={props.fallback} each={props.san_moves}>{(san, i) => <li onClick={() => props.on_set_cursor(i())} class='move' classList={{ cursor: props.cursor === i() }}><span class='index'>{ply_to_index_omit_black(i() + 1)}</span>{san}</li>}</For></ul>
        </div>
    </>)
}

