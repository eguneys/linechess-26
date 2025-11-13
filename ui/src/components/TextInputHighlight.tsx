import './TextInputHighlight.scss'

export default (props: { value?: string, size?: number, placeholder: string, on_keyup: (_: string, is_submit: boolean) => void }) => {

    const on_key_up = (e: KeyboardEvent) => {
        props.on_keyup((e.target as HTMLInputElement).value, e.key === 'Enter')
    }

    const value = () => props.value ?? ''

    return (
        <label  class='custom-field'>
            <input name="custom-field" size={props.size ?? 50} on:keyup={on_key_up} class="highlighted-text" type='text' placeholder="_" value={value()}></input>
            <span class='placeholder'>{props.placeholder}</span>
        </label>
    )
}