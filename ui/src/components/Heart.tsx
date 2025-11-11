import { createSignal, Show } from "solid-js"
import Icon, { Icons } from "./Icon"
import './Heart.scss'

export default (props: { nb_heart: number, is_heart: boolean, on_heart: (is_heart: boolean) => void }) => {

    const [is_beat, set_is_beat] = createSignal(false)
    const [is_heart, set_is_heart] = createSignal(props.is_heart)


    const toggle_heart = () => {
        set_is_heart(!is_heart())
        props.on_heart(is_heart())

        set_is_beat(true)
        setTimeout(() => set_is_beat(false), 200)
    }

    return (<>
        <span onClick={toggle_heart} class='heart' classList={{'is-heart': is_heart(), 'beat': is_beat()}}>
            <Show when={is_heart()} fallback={
                <Icon icon={Icons.HeartEmpty} />
            }>
                <Icon icon={Icons.HeartFilled} />
            </Show>
            <span class='nb'>{props.nb_heart}</span>
        </span>
    </>)
}