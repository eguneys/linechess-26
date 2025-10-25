import { createMemo, createSignal, For, onCleanup, onMount, Show, type JSX } from "solid-js";
import { Portal } from "solid-js/web";
import './SortableList.scss'
import { createWritableMemo } from "@solid-primitives/memo";
import { DragHandler } from "../game/drag";
import { Loop } from "../game/loop_input";
import { box_intersect, type XY, type XYWH } from "../game/util";
import { Vec2 } from "../game/vec2";

export default function SortableList<Item, U extends JSX.Element>(props: { 
    portal_selector: HTMLElement, 
    list: Item[], 
    set_list: (items: Item[]) => void, 
    children: (item: Item, index: () => number) => U 
    dragging: (item: Item) => U
}) {

    const [dragging_item, set_dragging_item] = createSignal<Item | undefined>(undefined)

    const [dragging_list, set_dragging_list] = createWritableMemo(() => props.list)

    const dragging_i = createMemo(() => dragging_item() ? dragging_list().indexOf(dragging_item()!): -1)


    const sort_by_swapping = (a: number, b: number) => {
        let l = dragging_list()

        ;[l[a], l[b]] = [l[b], l[a]]

        set_dragging_list(l.slice(0))
    }

    onMount(() => {

        let is_just_down: XY | undefined

        const drag_update = (delta: number) => {

            if (drag.is_just_down) {
                is_just_down = drag.is_just_down
            }



            if (drag.is_hovering) {
                set_drag_xy(drag.is_hovering)
                if (dragging_item() !== undefined) {
                    let id = get_$draggables_intersects_i(drag.is_hovering)

                    if (id) {

                        sort_by_swapping(dragging_i(), id[0])
                    }
                }

                if (is_just_down) {
                    if (Vec2.make(...drag.is_hovering).distance(Vec2.make(...is_just_down)) > 4) {

                        let id = get_$draggables_intersects_i(drag.is_hovering)

                        if (id) {
                            let [i, decay] = id
                            let item = dragging_list()[i]
                            // @ts-ignore
                            set_dragging_item(item)

                            set_drag_decay(decay)
                        }
                        is_just_down = undefined
                    }
                }
            }

            if (drag.is_up) {
                set_dragging_item(undefined)
                loop.stop()

                props.set_list(dragging_list())

            }

            drag.update(delta)
        }



        let loop = Loop(drag_update, () => { })

        let drag = DragHandler(props.portal_selector, loop.start)
        onCleanup(() => {
            console.log('cleanup')
            drag.disconnect()
            loop.stop()
        })



        const $draggables = createMemo<XYWH[]>(() => {
            let bb_parent = props.portal_selector.getBoundingClientRect()
            return [...$list.querySelectorAll('.draggable')]
                .map(_ => {
                    let bb = _.getBoundingClientRect()
                    return [bb.left - bb_parent.left, bb.top - bb_parent.top, bb.width, bb.height]
                })
        })

        const cursor_box = (xy: XY): XYWH => [xy[0] - 5, xy[1] - 5, 10, 10]

        const get_$draggables_intersects_i = (pos: XY): [number, XY] | undefined => {
            let i = $draggables().findIndex(_ => box_intersect(_, cursor_box(pos)))

            let $el = $draggables()[i]

            return [i, [pos[0] - $el[0], pos[1] - $el[1]]]
        }
    })

    const [drag_decay, set_drag_decay] = createSignal([0, 0])
    const [drag_xy, set_drag_xy] = createSignal([0, 0])

    const dragging_style = createMemo(() => ({
        transform: `translate(${drag_xy()[0] - drag_decay()[0]}px, ${drag_xy()[1] - drag_decay()[1]}px)`
    }))

    let $list: HTMLUListElement


    return (<>
        <Show when={dragging_item()}>{item => 
            <Portal mount={props.portal_selector}>
                <div style={dragging_style()} class='sortable-list-dragging'>{props.dragging(item())}</div>
            </Portal>
        }</Show>
        <ul ref={_ => $list = _} class='sortable-list'>
            <For each={dragging_list()}>{(item, i) =>
                <li classList={{dragging: dragging_i() === i()}} class='draggable'>{props.children(item, i)}</li>
            }</For>
        </ul>
        </>)
}