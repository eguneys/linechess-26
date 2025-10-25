import { TouchMouse } from "./loop_input"
import { appr } from './util'

type XY = [number, number]

export type DragHandler = {
    is_hovering?: XY
    is_down?: XY
    is_just_down?: XY
    is_up?: XY
    is_double_click?: XY
    update(delta: number): void
    has_moved_after_last_down: boolean
    disconnect(): void
    manual_trigger_down_hook(e: XY): void
}

export function DragHandler(el: HTMLElement, on_just_down: () => void) {

    let is_hovering: XY | undefined

    let is_down: XY | undefined

    let is_up: XY | undefined

    let is_just_down: XY | undefined

    let is_double_click: XY | undefined
    let has_moved_after_last_down = false

    let t_double_click = 0

    let hooks = {
        on_down(e: XY) {
            is_up = undefined
            is_down = e
            is_just_down = e
            has_moved_after_last_down = false
            on_just_down()
        },
        on_up(e: XY) {
            is_down = undefined
            is_hovering = undefined
            is_up = e
        },
        on_move(e: XY) {
            is_hovering = e
            has_moved_after_last_down = true
        }
    }


    let tm_cleanup = TouchMouse(el, hooks)

    return {
        get is_hovering() {
            return is_hovering
        },
        get is_down() {
            return is_down
        },
        get is_up() {
            return is_up
        },
        get is_just_down() {
            return is_just_down
        },
        get is_double_click() {
            return is_double_click
        },
        get has_moved_after_last_down() {
            return has_moved_after_last_down
        },
        update(delta: number) {

            is_double_click = undefined

            if (is_just_down) {
                if (t_double_click > 0) {
                    is_double_click = is_just_down
                    t_double_click = 0
                }
            }

            t_double_click = appr(t_double_click, 0, delta)
            is_just_down = undefined
            is_up = undefined
        },
        disconnect() {
            tm_cleanup()
        },
        manual_trigger_down_hook(e: XY) {

            hooks.on_down(e)
        }
    }
}