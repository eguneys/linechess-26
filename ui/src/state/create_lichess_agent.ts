const API_ENDPOINT = 'https://lichess.org'
export function create_lichess_agent(token: string) {
    const $ = (path: string) => fetch(API_ENDPOINT + path, { 
        headers: {
            'Authorization': `Bearer ${token}`
        }
    }).then(_ => _.json())


    return {
        async fetch_username() {
            let profile = await $('/api/account')
            return profile.username
        }
    }
}