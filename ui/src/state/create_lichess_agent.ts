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
        },
        async fetch_games(username: string, since: number): Promise<exportGameResponse[]> {

            try {

                let query = `?since=${since}&perfType=bullet,blitz,rapid,classical`

                const acceptHeader = 'application/x-ndjson'
                
                const result = await $stream_ndjson<exportGameResponse>(`/api/games/user/${username}${query}`, { headers: { Accept: acceptHeader } });

                let splitData: exportGameResponse[] = []

                let max = 70
                for await (const line of result) {
                  if (max-- <= 0) {
                    break
                  }
                  splitData.push(line)
                    
                }

                return Promise.resolve(splitData);
            } catch (error) {
                return Promise.reject(error);
            }
        }
    }
}


type openingVariants = 'standard' | 'chess960' | 'crazyhouse' | 'antichess' | 'atomic' | 'horde' | 'kingOfTheHill' | 'racingKings' | 'threeCheck' | 'fromPosition'
type openingSpeeds = 'ultraBullet' | 'bullet' | 'blitz' | 'rapid' | 'classical' | 'correspondence'
type statuses = 'created' |'started' |'aborted' |'mate' |'resign' |'stalemate' |'timeout' |'draw' |'outoftime' |'cheat' |'noStart' |'unknownFinish' |'variantEnd'

type titles = 'GM' | 'WGM' | 'IM' | 'WIM' | 'FM' | 'WFM' | 'NM' | 'CM' | 'WCM' | 'WNM' | 'LM' | 'BOT'

type gamePlayers = {
  user: { id: string, name: string, title: titles, patron: boolean },
  rating: number,
  ratingDiff: number,
  name: string,
  provisional: boolean,
  aiLevel: number,
  analysis: {
    inaccuracy: number,
    mistake: number,
    blunder: number,
    acpl: number
  },
  team: string
}

export type exportGameResponse = {
  id: string,
  rated: boolean,
  variant: openingVariants,
  speed: openingSpeeds,
  perf: string,
  createdAt: number,
  lastMoveAt: number,
  status: statuses,
  players: {
    white: gamePlayers,
    black: gamePlayers
  },
  initialFen: string,
  winner: 'white' | 'black',
  opening: {
    eco: string,
    name: string,
    ply: number
  },
  moves: string,
  pgn?: string,
  daysPerTurn: number,
  tournament: string,
  swiss: string,
}


const $stream_ndjson = <T>(path: string, opts?: RequestInit) => fetch(API_ENDPOINT + path, { ...opts }).then(_ => read_ndjson<T>(_.body!))

async function* read_ndjson<T>(readableStream: ReadableStream): AsyncGenerator<T> {
  const reader = readableStream.pipeThrough(new TextDecoderStream('utf-8')).getReader();
  let runningText = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const obj of value.split('\n')) {
      try {
        runningText += obj;
        let result = JSON.parse(runningText);
        yield result;
        runningText = '';
      } catch (e) {
        // Not a valid JSON object
      }
    }
  }
}