import type { JSX } from 'solid-js'
import './MeetButton.scss'

export function MeetButton(props: { children: JSX.Element, disabled?: boolean, onClick?: () => void, gray?: boolean, meet?: boolean, draw?: boolean }) {
    return (
        <button disabled={props.disabled} classList={{gray: props.gray, draw: props.draw || props.meet, meet: props.meet}} class="draw" onClick={props.onClick}>{props.children}</button>
    )
}