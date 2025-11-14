import { createContext, type JSX, useContext } from "solid-js"
import { create_openings_store, type OpeningsStore } from './create_openings_store'
import { create_build_store, type OpeningsBuildStore } from "./create_build_store"
import { createStore } from "solid-js/store"

export type OpeningsStore2 = {
    openings: OpeningsStore,
    build: OpeningsBuildStore
}

const OpeningsStoreContext = createContext<OpeningsStore2>()

export function useStore() {
    return useContext(OpeningsStoreContext)!
}

export function useOpeningsStore() {
    return useStore().openings
}

export function useBuildStore() {
    return useStore().build
}



export function OpeningStoreProvider(props: { children: JSX.Element}) {

    let openings_store: OpeningsStore,
    build_store: OpeningsBuildStore

    const [store] = createStore<OpeningsStore2>({
        get openings() { 
            return openings_store
        },
        get build() {
            return build_store
        }
    })

    openings_store = create_openings_store(store)
    build_store = create_build_store(store)


    return (<>
    <OpeningsStoreContext.Provider value={store}>
        {props.children}
    </OpeningsStoreContext.Provider>
    </>)
}

