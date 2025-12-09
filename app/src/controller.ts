import express from 'express'
import * as service from './service.ts'
import { line_view_json, paginated_view_json, playlist_view_json, user_view_json } from './view_json.ts'

import config from '../config.json' with { type: 'json' }
import passport from 'passport'
import LichessStrategy from 'passport-lichess'
import { gen_id } from './repository.ts'
import { is_timestamp_in_today } from './util.ts'

function ok(data: any) { return { ok: true, data }; }
function error(message: string | string[]) { return { ok: false, errors: message }; }

export const router = express.Router()

router.use(passport.session())

// -- Passport Lichess --

const domain = config.domain

passport.use(new LichessStrategy({
    clientID: gen_id(),
    callbackURL: `${domain}/auth/lichess/callback`,
    passReqToCallback: true
}, async function (req: express.Request, accessToken: string, refreshToken: string, profile: any, cb: Function) {

    let user = await service.upgrade_user_to_lichess(req.session.userId!, accessToken, profile.username)

    user.unwrap(user => {
        cb(null, user)
    }, err => cb(err))
}))

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user: any, done) {
    done(null, user);
});

router.get('/auth/lichess', passport.authenticate('lichess'))

router.get('/auth/lichess/callback', passport.authenticate('lichess', {
    successRedirect: config.spa_domain,
    failureRedirect: config.spa_domain 
}))



router.get("/session/init", async (req, res) => {
    if (!req.session.userId) {
        if (req.user) {
            req.session.userId = req.user.id
        }
    }


    if (!req.session.userId) {
        let user = await service.create_user()

        user.unwrap(user => {
            req.session.userId = user.id;
            console.log("🆕 Created guest user:", user.id);

            res.json(ok(user_view_json(user)));
        }, err => {
            res.status(500).json(error('Internal server error'))
        })
    } else {
        let user = await service.get_user_by_id(req.session.userId)
        
        user.unwrap(user => {
            res.json(ok(user_view_json(user)));
        }, err => {
            if (error instanceof service.UserNotFoundError) {
                res.status(404).json(error(err.message));
            } else {
                res.status(500).json(error('Internal server error'));
            }
        })
    }
});


// --- Session Authorization --

router.post("/logout", async (req, res, next) => {
    delete req.session.userId
    req.logout(function (err) {
        if (err) { return next(err)}
        res.send(ok(void 0))
    })

})

router.post('/fetch_lichess_token', async function(req, res, next) {

    let token = await service.get_lichess_token_by_user_id(req.session.userId!)

    token.unwrap(token => {
        res.send(ok({token: token.lichess_access_token}))
    }, err => {
        if (err instanceof service.LichessTokenNotFoundErrorForUser) {
            res.status(404).send(error(err.message))
        } else {
            res.status(500).json(error('Internal server error'));
        }
    })
})

// -- Routes --

router.post("/playlist/like", async (req, res) => {
    const userId = req.session.userId!
    const { id: playlist_id , yes } = req.body;


    let like = await service.playlist_like(userId, playlist_id, yes)

    like.unwrap(() => {
        res.json(ok(void 0));
    }, err => {
        res.status(500).json(error('Internal server error'));
    })
});




router.post("/playlist/edit", async (req, res) => {
    const user_id = req.session.userId!
    const { id, body } = req.body;

    let result = await service.edit_playlist(user_id, id, body)
    
    result.unwrap(playlist => {
        res.json(ok(playlist_view_json(playlist)));
    }, err => {
        if (err instanceof service.PlaylistNotFoundError) {
            res.status(404).json(error(err.message));
        } else {
            res.status(500).json(error('Internal server error'));
        }
    })
});

router.post("/playlist/create", async (req, res) => {

    let user_id = req.session.userId!
    const { name, line } = req.body;

    let playlist = await service.create_playlist(user_id, name)

    playlist.unwrap(playlist => {
        res.json(ok(playlist_view_json(playlist)));
    }, () => {
        res.status(500).json(error('Internal server error'));
    })

});


router.post("/playlist/delete", async (req, res) => {
    const { id } = req.body;
    
    let result = await service.delete_playlist(id)

    result.unwrap(() => {
        res.json(ok(void 0));
    }, () => {
        res.status(500).json(error('Internal server error'));
    })
})

router.post("/line/delete", async (req, res) => {
    const { id } = req.body

    let result = await service.delete_line(id)

    result.unwrap(() => {
        res.json(ok(void 0));
    }, () => {
        res.status(500).json(error('Internal server error'));
    })
});


router.post("/line/edit", async (req, res) => {
    const { id, name } = req.body;
    

    let result = await service.edit_line(id, { name })
    
    result.unwrap(line => {
        res.json(ok(line_view_json(line)));
    }, err => {
        if (err instanceof service.LineNotFoundError) {
            res.status(404).json(error(err.message));
        } else {
            res.status(500).json(error('Internal server error'));
        }
    })
});

router.post("/line/create", async (req, res) => {
    let user_id = req.session.userId!
    let playlist_id = req.body.playlist_id
    const { name, moves, orientation } = req.body;

    let line = await service.create_line(user_id, playlist_id, { name, moves, orientation })

    line.unwrap(line => {
        if (!line) {
            res.status(500).json(error('Internal server error'));
        } else {
            res.json(ok(line_view_json(line)))
        }
    }, err => {
        res.status(500).json(error('Internal server error'));
    })
});

router.post("/line/set_ordered", async (req, res) => {
    let userId = req.session.userId
    let { playlist_id, lines } = req.body

    let result = await service.order_lines(lines, playlist_id)
   
    result.unwrap(() => {
        res.json(ok(void 0));
    }, err => {
        res.status(500).json(error('Internal server error'));
    })
});


router.get("/playlist/global", async (req, res) => {
    const user_id = req.session.userId!
    let page = 1
    if (typeof req.query.page === 'string') {
        page = parseInt(req.query.page)
    }
    const page_size = 20
    const offset = (page - 1) * page_size

    let result = await service.get_playlists_paginated(user_id, page_size, offset)

    result.unwrap(({count, playlists}) => {
        res.json(paginated_view_json(page, page_size, count, playlists.map(playlist_view_json)));
    }, err => {
        res.status(500).json(error('Internal server error'));
    })
});


router.get("/playlist/mine", async (req, res) => {
    let user_id = req.session.userId!


    let result = await service.get_playlists_mine(user_id)

    result.unwrap(playlists => {
        res.json(playlists.map(playlist_view_json));
    }, err => {
        res.status(500).json(error('Internal server error'));
    })
});


router.get("/playlist/liked", async (req, res) => {
    let user_id = req.session.userId!


    let result = await service.get_playlists_liked(user_id)

    result.unwrap(playlists => {
        res.json(playlists.map(playlist_view_json));
    }, err => {
        res.status(500).json(error('Internal server error'));
    })
});


router.get("/playlist/selected", async (req, res) => {
    let user_id = req.session.userId!

    let result = await service.get_selected_playlist(user_id)


    result.unwrap(({playlist, lines}) => {
        res.json({ playlist: playlist_view_json(playlist), lines: lines.map(line_view_json) });
    }, err => {
        res.status(500).json(error('Internal server error'));
    })
});

router.get("/playlist/selected/:id", async (req, res) => {
    const user_id = req.session.userId!
    let playlist_id = req.params.id


    let result = await service.get_playlist_by_id(playlist_id, user_id)


    result.unwrap(({playlist, lines}) => {
        res.json({ playlist: playlist_view_json(playlist), lines: lines.map(line_view_json) });
    }, err => {
        res.status(500).json(error('Internal server error'));
    })
});

router.post('/ofs/stats', async (req, res) => {
    let user_id = req.session.userId!
    let { query } = req.body

    if (!Array.isArray(query) || query.length > 70) {
        res.json(error("Bad query"))
        return
    }

    // get today's games
    query = query.filter(_ => is_timestamp_in_today(_.created_at))

    let result = await service.compute_ofs_and_get_daily(user_id, query)



    result.unwrap(({pages, lines}) => {
        res.send(ok({ pages, lines: lines.map(line_view_json) }))
    }, err => {
        res.status(500).json(error('Internal server error'));
    })
})

