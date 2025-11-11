import { createEffect, on, onCleanup, onMount, type JSX } from 'solid-js'
import './PopupMenu.scss'
import { Portal, Show } from 'solid-js/web'


export default (props: { set_open: (_: boolean) => void, is_open: boolean, portal_selector: HTMLElement, children: JSX.Element, dialog: JSX.Element }) => {

    createEffect(on(() => props.is_open, (is_open: boolean) => {

        if (is_open) {
            props.portal_selector.classList.add('active')
        } else {
            props.portal_selector.classList.remove('active')
        }
    }))

    onMount(() => [
        props.portal_selector.addEventListener('click', on_close)
    ])

    onCleanup(() => {
        props.portal_selector.removeEventListener('click', on_close)
    })

    const on_close = (e: MouseEvent) => {
        if ($el_menu && $el_menu.contains(e.target as Node)) {
            return
        }
        props.set_open(false)
    }

    let $el_menu: HTMLDivElement | undefined

    return (<>
    <Portal mount={props.portal_selector}>
        <Show when={props.is_open}>
            <div ref={$el_menu} class='popup-menu'>
                {props.dialog}
            </div>
        </Show>
    </Portal>
    <div onClick={() => props.set_open(!props.is_open)} class='popup-menu-toggle-button'>
        {props.children}
    </div>
    </>)
}