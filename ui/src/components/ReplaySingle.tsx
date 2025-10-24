import { For, type JSX } from 'solid-js'
import './ReplaySingle.scss'
import { ply_to_index_omit_black } from './steps'

export type SAN = string

export default function ReplaySingle(props: { fallback: JSX.Element, san_moves: SAN[], cursor: number, on_set_cursor: (i: number) => void }) {

    
    return (<>
        <ul class='replay'><For fallback={props.fallback} each={props.san_moves}>{(san, i) => <li onClick={() => props.on_set_cursor(i())} class='move' classList={{cursor: props.cursor === i()}}><span class='index'>{ply_to_index_omit_black(i() + 1)}</span>{san}</li>}</For></ul>
    </>)
}

