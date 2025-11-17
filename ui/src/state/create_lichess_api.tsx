import { OAuth2AuthCodePKCE} from "@bity/oauth2-auth-code-pkce"
import { createStore } from "solid-js/store"
import { createAsync } from "@solidjs/router"
import { makePersisted } from "@solid-primitives/storage"
import { createSignal } from "solid-js"
import { create_lichess_agent } from "./create_lichess_agent"
import type { OpeningsStore2 } from "./OpeningsStore2"


export type LichessState = {
    username: string | undefined
}

export type LichessActions = {
    login: () => Promise<void>
    logout: () => void
}

export type LichessApiStore = [LichessState, LichessActions]


export function create_lichess_api(store: OpeningsStore2): LichessApiStore {

    const clientUrl = (() => {
        const url = new URL(location.href);
        url.search = '';
        return url.href;
    })();

  let oauth = new OAuth2AuthCodePKCE({
    authorizationUrl: 'https://lichess.org/oauth',
    tokenUrl: 'https://lichess.org/api/token',
    clientId: 'linechess.com',
    scopes: [''],
    redirectUrl: clientUrl,
    onAccessTokenExpiry: refreshAccessToken => refreshAccessToken(),
    onInvalidGrant: _retry => {}
  })



  const login = async () => {
    await oauth.fetchAuthorizationCode()
  }

  let [store_access_token, set_store_access_token] = makePersisted(createSignal<string | undefined>(undefined, { equals: false }), {
    name: '.linechess.lichess-token'
  })


    const [, { profile_login, profile_logout }] = store.openings
    let $agent = createAsync(async () => {

        let res = store_access_token()
        let hasAuthCode = await oauth.isReturningFromAuthServer()


        if (hasAuthCode) {
            let { token } = await oauth.getAccessToken()

            if (token) {
                const newUrl = '/'
                window.history.replaceState({}, document.title, newUrl);
                set_store_access_token(token.value)

                let $agent = create_lichess_agent(token.value)

                let username = await $agent.fetch_username()

                if (username) {

                    profile_login(username)
                }

                return $agent
            }
        }

        if (res) {
            return create_lichess_agent(res)
        }
    })

    const logout = () => {
        set_store_access_token(undefined)
        profile_logout()
    }

    const username = createAsync<string>(async () => {
        return $agent()?.fetch_username()
    })

  let [state, _set_state] = createStore({
    get username() {
        return username()
    }
  })

  let actions = {
    login,
    logout
  }

  return [state, actions]

}