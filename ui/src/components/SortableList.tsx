import { createMemo, createSignal, For, onCleanup, onMount, Show, type JSX } from "solid-js";
import { Portal } from "solid-js/web";
import './SortableList.scss'
import { createWritableMemo } from "@solid-primitives/memo";
import { DragHandler } from "../game/drag";
import { Loop } from "../game/loop_input";
import { box_intersect, type XY, type XYWH } from "../game/util";
import { Vec2 } from "../game/vec2";
import Icon, { Icons } from "./Icon";

export default function SortableList<Item, U extends JSX.Element>(props: { 
    portal_selector: HTMLElement, 
    list: Item[], 
    set_list: (items: Item[]) => void, 
    children: (item: Item, index: () => number) => U 
    dragging: (item: Item) => U
}) {

    const [dragging_item, set_dragging_item] = createSignal<{ item: Item } | undefined>(undefined)

    const [dragging_list, set_dragging_list] = createWritableMemo(() => props.list.map(item => ({ item })))

    const dragging_i = createMemo(() => dragging_item() ? dragging_list().indexOf(dragging_item()!): -1)

    const sort_by_swapping = (a: number, b: number) => {

        if (a === b) {
            return
        }

        let l = dragging_list()

        ;[l[a], l[b]] = [l[b], l[a]]

        set_dragging_list(l.slice(0))
    }

    let drag: DragHandler


    let pp_bounds: DOMRect | undefined
    const get_pp_bounds = () => {
        if (pp_bounds === undefined) {
            pp_bounds = props.portal_selector.getBoundingClientRect()
        }
        return pp_bounds
    }



    let wrap_bounds: DOMRect | undefined
    let [list_bounds, set_list_bounds] = createSignal<DOMRect | undefined>(undefined)

    const get_wrap_bounds = () => {
        if (wrap_bounds === undefined) {
            wrap_bounds = $wrap.getBoundingClientRect()
        }
        return wrap_bounds
    }

    const wrap_bottom_edge = (): XYWH => {
        let pp_b = get_pp_bounds()
        let wrap_bounds = get_wrap_bounds()
        let offset = 10
        return [wrap_bounds.left - pp_b.left, wrap_bounds.bottom - pp_b.top - offset, wrap_bounds.width, offset]
    }
    const wrap_top_edge = (): XYWH => {
        let pp_b = get_pp_bounds()
        let wrap_bounds = get_wrap_bounds()
        let offset = 10
        return [wrap_bounds.left - pp_b.left, wrap_bounds.top - pp_b.top, wrap_bounds.width, offset]
    }



    const get_list_bounds = () => {
        if (list_bounds() === undefined) {
            set_list_bounds($list.getBoundingClientRect())
        }
        return list_bounds()!
    }


    const cursor_box = (xy: XY): XYWH => [xy[0] - 5, xy[1] - 5, 10, 10]

    onMount(() => {
        let is_just_down: XY | undefined

        const drag_update = (delta: number) => {

            if (drag.is_just_down) {
                is_just_down = drag.is_just_down
            }


            if (drag.is_hovering) {
                if (box_intersect(wrap_bottom_edge(), cursor_box(drag.is_hovering))) {
                    $wrap.scrollTop += 10
                }
                if (box_intersect(wrap_top_edge(), cursor_box(drag.is_hovering))) {
                    $wrap.scrollTop -= 10
                }

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

                props.set_list(dragging_list().map(_ => _.item))

                props.portal_selector.classList.remove('active')
            }

            drag.update(delta)
        }



        let loop = Loop(drag_update, () => { })

        drag = DragHandler(props.portal_selector, loop.start)

        const on_scroll = () => {
            set_list_bounds(undefined)
            wrap_bounds = undefined
            pp_bounds = undefined
        }



        $wrap.addEventListener('scroll', on_scroll)
        let rr = new ResizeObserver(on_scroll)
        rr.observe($wrap)




        onCleanup(() => {
            drag.disconnect()
            loop.stop()

            $wrap.removeEventListener('scroll', on_scroll)
            rr.unobserve($wrap)
        })


        const $draggables = createMemo<XYWH[]>(() => {
            get_list_bounds()
            let bb_parent =  get_pp_bounds()
            return [...$list.querySelectorAll('.draggable')]
                .map(_ => {
                    let bb = _.getBoundingClientRect()
                    let xy = [bb.left - bb_parent.left, bb.top - bb_parent.top]
                    return [xy[0], xy[1], bb.width, bb.height]
                })
        })


        const get_$draggables_intersects_i = (pos: XY): [number, XY] | undefined => {
            let i = $draggables().findIndex(_ => box_intersect(_, cursor_box(pos)))

            if (i === -1) {
                return undefined
            }

            let $el = $draggables()[i]

            return [i, [pos[0] - $el[0], pos[1] - $el[1]]]
        }

    })

    const [drag_decay, set_drag_decay] = createSignal([0, 0])
    const [drag_xy, set_drag_xy] = createSignal([0, 0])

    const dragging_style = createMemo(() => ({
        transform: `translate(${drag_xy()[0] - drag_decay()[0]}px, ${drag_xy()[1] - drag_decay()[1]}px)`
    }))

    let $wrap: HTMLElement
    let $list: HTMLUListElement

    const on_manual_click_drag_start = (e: MouseEvent) => {
        if (drag === undefined) {
            return
        }

        let bb_parent = get_pp_bounds()
        let xy: XY = [e.clientX - bb_parent.left, e.clientY - bb_parent.top]

        if (box_intersect(wrap_bottom_edge(), cursor_box(xy))) {
            return
        }
        if (box_intersect(wrap_top_edge(), cursor_box(xy))) {
            return
        }


        drag.manual_trigger_down_hook(xy)
        e.preventDefault()

        props.portal_selector.classList.add('active')
    }

    return (<>
        <Show when={dragging_item()}>{item => 
            <Portal mount={props.portal_selector}>
                <div style={dragging_style()} class='sortable-list-dragging'>{props.dragging(item().item)}</div>
            </Portal>
        }</Show>
        <div ref={_ => $wrap = _} class="sortable-list-wrap">
            <ul ref={_ => $list = _} class='sortable-list'>
                <For each={dragging_list()}>{(item, i) =>
                    <li 
                        classList={{ dragging: dragging_i() === i() }} 
                        class='draggable'>
                        <div class='handle' onPointerDown={on_manual_click_drag_start}>
                            <Icon icon={Icons.DotEmpty}/>
                            <span>{i() + 1}.</span>
                        </div>
                        <div class='content'>
                            {props.children(item.item, i)}
                        </div>
                    </li>
                }</For>
            </ul>
        </div>
        </>)
}