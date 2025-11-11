import { createSelector, type JSX } from "solid-js"
import './ActionButton.scss'

export type Action = typeof Actions[keyof typeof Actions]

export const Actions = {
    Ok: 1,
    Cancel: 2,
    Normal: 3
}

export default (props: { children: JSX.Element, onClick: () => void, action: Action }) => {

    const is_action = createSelector(() => props.action)

    return (<>
    <button class="action-button" onClick={props.onClick} classList={{ok: is_action(Actions.Ok), cancel: is_action(Actions.Cancel), normal: is_action(Actions.Normal) }}>
            {props.children}
    </button>
    </>)
}