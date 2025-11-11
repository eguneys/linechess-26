import { createEffect, createSignal, onCleanup, onMount, Show, type JSX } from "solid-js"
import './DropdownMenu.scss'
import { Portal } from "solid-js/web"

export default (props: { portal_selector: HTMLElement, children: JSX.Element, button: JSX.Element }) => {

    let $el_menu: HTMLDivElement | undefined
    let $el_btn: HTMLButtonElement | undefined
    const [is_show, set_is_show] = createSignal(false)

    createEffect(() => {
        is_show()
        if ($el_btn === undefined || $el_menu === undefined) {
            return
        }

        let container_rect = props.portal_selector.getBoundingClientRect()
        let button_rect = $el_btn.getBoundingClientRect()

        let menu_top = button_rect.bottom - container_rect.top
        let menu_left = button_rect.left - container_rect.left

        if (menu_left + 200 > window.innerWidth) {
            menu_left -= 200 - button_rect.width
        }

        $el_menu.style.top = `${menu_top}px`
        $el_menu.style.left = `${menu_left}px`
    })

    const on_resize = () => {
        set_is_show(false)
    }


    onCleanup(() => {
        window.removeEventListener('resize', on_resize)
        document.removeEventListener('click', close_on_click)
    })

    onMount(() => {
        window.addEventListener('resize', on_resize)
        document.addEventListener('click', close_on_click)
    })

    function close_on_click(e: MouseEvent) {
        if ($el_menu === undefined || $el_menu.contains(e.target as Node)) {
            return
        }
        set_is_show(false)
    }

    function on_toggle_show(e: MouseEvent) {
        if (!props.portal_selector.classList.contains('active')) {
          e.stopImmediatePropagation()
        }
        set_is_show(!is_show())
    }

    createEffect(() => {
        if (is_show()) {
            props.portal_selector.classList.add('active')
        } else {
            props.portal_selector.classList.remove('active')
        }
    })

    return (<>
        <Portal mount={props.portal_selector}>
            <Show when={is_show()}>
            <div ref={$el_menu} class='dropdown-menu show'>
                {props.children}
            </div>
            </Show>
        </Portal>
        <button ref={$el_btn} onClick={on_toggle_show} class='dropdown-menu-toggle-button' classList={{active: is_show()}}>
            {props.button}
        </button>
    </>)
}