import { createContext, JSX, useContext } from "solid-js"
import { create_openings_store, type OpeningsStore } from './create_openings_store'


const OpeningsStoreContext = createContext<OpeningsStore>()

export function useStore() {
    return useContext(OpeningsStoreContext)
}

export function OpeningStoreProvider(props: { children: JSX.Element}) {

    const store: OpeningsStore = create_openings_store()


    return (<>
    <OpeningsStoreContext.Provider value={store}>
        {props.children}
    </OpeningsStoreContext.Provider>
    </>)
}