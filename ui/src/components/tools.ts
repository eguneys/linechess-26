import type { JSX } from "solid-js"

export type WrappedElement<P> = (props: P) => JSX.Element

export type NodeName = string

export const get_elements = (
    children: JSX.Element | ((...args: any[]) => JSX.Element),
    filter?: NodeName | ((node: HTMLElement) => boolean),
    props: any = [],
    result = []): HTMLElement[] | undefined => {
        if (!children) {
            return
        }
        if (Array.isArray(children)) {
            children.forEach((child) => get_elements(child, filter, props, result))
        } else if (typeof children === 'function') {
            get_elements(children.apply(null, props), filter, props, result)
        } else {
            const node = children as HTMLElement

            if (!filter || (typeof filter === "function" ? filter(node) : node.nodeName === filter)) {
                (result as HTMLElement[]).push(node)
            }
        }
        return result
    }

