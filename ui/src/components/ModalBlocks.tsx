
import { createEffect, createMemo, createSignal, type JSX, mergeProps, Show, splitProps, type Accessor, type Component } from "solid-js"
import { Portal } from "solid-js/web"
import { get_elements, type WrappedElement } from "./tools"
import './ModalBlocks.scss'

export type WrappedModelContentProps = {
    open: Accessor<boolean>,
    toggle: (open?: boolean | unknown) => void
    set_hold_close_outside: (hold_close: boolean) => void
}

export type ModalProps = Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> & 
{
    close_on_click_outside?: boolean
    children: WrappedElement<WrappedModelContentProps> | JSX.Element
    open?: boolean
    portal_selector: HTMLElement
}


/* https://github.com/atk/solid-blocks/blob/main/src/blocks/modal.tsx */
export const Modal = (props: ModalProps) => {
    const [local, container_props] = splitProps(props, [
        "open",
        "children",
        "portal_selector",
        "close_on_click_outside"
    ])

    const [hold_close_outside, set_hold_close_outside] = createSignal(false)
    const [open, set_open] = createSignal(local.open)

    createEffect(() => set_open(local.open))

    const toggle = (open?: boolean) =>
        set_open(typeof open === 'boolean' ? open: (o) => !o)
    const modal_content = createMemo(() =>
    get_elements(
        local.children,
        (node) => node.className.indexOf('sb-modal-content') !== -1,
        [{open, toggle, set_hold_close_outside}]
    ) ?? [])

    const other_children = createMemo(() =>
        get_elements(local.children,
            (node) => node.className.indexOf('sb-modal-content') === -1,
            [{ open, toggle, set_hold_close_outside }]
        )
    )


    let modal_ref!: HTMLDivElement
    createEffect(() => open() && modal_ref?.focus(), modal_ref?.scrollIntoView())

    const div_props = mergeProps(container_props, {
        role: 'dialog' as JSX.HTMLAttributes<HTMLDivElement>['role'],
        tabIndex: -1,
        class: props.class ? `sb-modal ${props.class}` : `sb-modal`,
        children: modal_content(),
        onClick: createMemo(() =>
            local.close_on_click_outside ? (ev: MouseEvent) => {
                if (hold_close_outside()) {
                    return
                }
                const target = ev.target as HTMLElement
                if (!modal_content().some((content) => content?.contains(target))) {
                    toggle(false)
                }
            } : undefined
        )(),
    })

    return (<>
        <Show when={open()} fallback={other_children()}>
            <>
            {other_children()}
            <Portal mount={local.portal_selector}>
                <div ref={modal_ref} {...div_props}/>
            </Portal>
            </>
        </Show >
    </>
    )
}


export type ModelContentProps = JSX.HTMLAttributes<HTMLDivElement>

export const ModalContent: Component<ModelContentProps> = (props) => (
    <div {...props} class={props.class ? `sb-modal-content ${props.class}`: `sb-modal-content`}/>
)


export type ModalHeaderProps = JSX.HTMLAttributes<HTMLDivElement>
export const ModalHeader: Component<ModelContentProps> = (props) => (
    <div {...props} class={props.class ? `sb-modal-header ${props.class}`: `sb-modal-header`}/>
)




export type ModalBodyProps = JSX.HTMLAttributes<HTMLDivElement>
export const ModalBody: Component<ModelContentProps> = (props) => (
    <div {...props} class={props.class ? `sb-modal-body ${props.class}`: `sb-modal-body`}/>
)

export type ModalFooterProps = JSX.HTMLAttributes<HTMLDivElement>
export const ModalFooter: Component<ModelContentProps> = (props) => (
    <div {...props} class={props.class ? `sb-modal-footer ${props.class}`: `sb-modal-footer`}/>
)