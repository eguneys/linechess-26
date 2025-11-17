import Lichess from 'lichess-node'
import { exportGameResponse } from 'lichess-node/dist/types';

const lichess = new Lichess()

type ProcessedGameResult = {

}

type UserGamesDBItem = {
    id: string;
    username: string;
    lichess_since?: number;
};


// Mock DB functions
const db = {
    get_item_by_username: (username: string) => {
        throw new Error('Not implemented')
    },
    updateUserSince: (userId: string, timestamp: number) => {
        // Update user's last fetched timestamp
        console.log(`Updated user ${userId} since = ${timestamp}`);
    },
    add_games(games: exportGameResponse[]) {
        console.log(games)
    }
};



type FetchJob = {
    item: UserGamesDBItem;
    retries: number;
    resolve: (_: ProcessedGameResult[]) => void,
    reject: (err: Error) => void
};

// Simple in-memory queue
const queue: FetchJob[] = [];
let isProcessing = false;

// Fetch wrapper with retry
async function fetchWithRetry(username: string, since: number, retries = 3, delay = 1000): Promise<exportGameResponse[]> {
    for (let i = 0; i <= retries; i++) {
        try {
            const res = await lichess.games.exportGamesUser(username, "json", {
                since
            })
            return res
        } catch (err) {
            if (i === retries) throw err;
            console.log(`Retry ${i + 1} after error: ${err}`);
            await new Promise(r => setTimeout(r, delay * Math.pow(2, i))); // exponential backoff
        }
    }
    return [];
}

// Worker function
async function processQueue() {
    if (isProcessing) return; // Already running
    isProcessing = true;

    while (queue.length > 0) {
        const job = queue.shift()!;
        const { item, retries } = job;


        let username = item.username
        let since = item.lichess_since ?? Date.now() - 1000 * 60 * 60 * 24

        let games: exportGameResponse[] = []

        try {


            console.log(`Fetching games for ${username} from ${since}`);
            games = await fetchWithRetry(username, since, retries);

            console.log(`Fetched ${games.length} games for ${username}`);
        } catch (err) {
            console.error(`Failed to fetch games for ${username}: ${err}`);
            if (retries > 0) {
                console.log(`Re-queueing job for ${username} with ${retries - 1} retries left`);
                queue.push({ ...job, retries: retries - 1 });
            }
        } finally {
            if (games.length > 0) {

                await db.add_games(games)

                // Update user's last fetched timestamp
                if (games.length > 0) {
                    const latest = Math.max(...games.map(g => g.createdAt));
                    await db.updateUserSince(item.id, latest);
                }

            }

        }
    }

    isProcessing = false;
}

// Function to enqueue a fetch job
function enqueueFetch(item: UserGamesDBItem) {
    return new Promise((resolve, reject) => {
        queue.push({ item, retries: 3, resolve, reject });
        processQueue(); // trigger processing
    })
}


export async function process_lichess_username(username: string) {
    let item = await db.get_item_by_username(username)

    let res = await enqueueFetch(item)

    return res
}