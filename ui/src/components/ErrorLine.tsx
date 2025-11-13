import { Show } from 'solid-js'
import './ErrorLine.scss'

export default (props: { error?: string }) => {
    return (<>
        <Show when={props.error}>{error =>
            <span class='error-line'>{error()}</span>
        }</Show>
    </>)
}