import express from "express";
import sqlite3 from 'better-sqlite3'
import session, { Session } from 'express-session'
import SessionStore from 'better-sqlite3-session-store'
import bodyParser from "body-parser";
import cors from "cors";
import rateLimit from 'express-rate-limit';
import config from '../config.json' with { type: 'json' }

import { init_db } from './repository.ts'
import { router } from './controller.ts'

const SECRET = process.env.SECRET_SALT || 's3cr3t-s@lt'

const app = express();
app.use(cors({ credentials: true, origin: true }));
app.use(bodyParser.json());

// Rate limiting: 1 request per 15 seconds per IP
const limiter = rateLimit({
  windowMs: 15 * 1000,
  max: 3,
  message: { error: 'Too many submissions. Try again soon.' }
});
app.use('/submit', limiter);

const SqliteStore = SessionStore(session)
const session_db = new sqlite3('db/sessions.db')
session_db.pragma('journal_mode = WAL')

app.use(session({
    store: new SqliteStore({
        client: session_db,
        expired: {
            clear: true,
            intervalMs: 15 * 60 * 1000
        },
    }),
    secret: SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 400 * 1000 * 60 * 60 * 24 * 7 } // 400 weeks
}))


app.use(router)


app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err)
    res.status(500).send({ errors: err.message })
})

// --- Start ---
const PORT = process.env.PORT || config.port || 3300;

init_db().then(() => {
    app.listen(PORT, (err) => {
        if (err) {
            console.error(err)
        } else {
            console.log(`✅ Backend running on ${config.domain.split(':').slice(0, -1).join(':')}:${PORT}`)
        }
    });
});