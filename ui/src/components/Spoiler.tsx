import { createMemo, createSignal } from "solid-js"
import './Spoiler.scss'

export default function Spoiler(props: { text: string }) {

    let [hide, set_hide] = createSignal(true)
    const hidden_text = createMemo(() => hide() ? 'a'.repeat(props.text.length) : props.text)

    return (<>
        <span onClick={() => set_hide(false)} class='spoiler' classList={{ hidden: hide() }}>{hidden_text()}</span>
    </>)
}