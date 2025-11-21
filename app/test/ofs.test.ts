import { it } from 'vitest'
import { fill_ofs_stats } from '../src/util.ts'


it('works', () => {

    let lines: any = [
        { id: "a", "moves": "e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 d2d4 e5d4 e1h1 f6e4 f1e1 d7d5 c4d5 d8d5 b1c3 d5d7 c3e4 f8e7 c1g5 e8h8 g5e7 d7e7 f3d4 c8d7 d4b5 a8d8 d1h5 c6e5 b5c7 d7c6 e4g5 h7h6 g5e6 f7e6 h5e5 d8d2 f2f3 e7h4 e1e2 d2e2 e5e2 h4e7", },
    ]

    let game: any = {
        "ucis": "g2g3 d7d5 f1g2 e7e6 g1f3 g8f6 e1h1 f8e7 d2d3 c7c5 b1d2 b7b5 e2e4 b5b4 e4e5 f6d7 c2c3 b4c3 b2c3 c8a6 d3d4 a6f1 g2f1 c5c4 f3e1 e8h8 f2f4 g7g6 e1f3 f8e8 f1h3 e7f8 f3g5 f8h6 g5f3 b8c6 d2f1 a8b8 f1e3 c6a5 e3g4 a5c6 g4h6 g8h8 h6g4 e8g8 g4f2 d8f8 c1e3 f8d8 d1d2 d8a5 g3g4 a5a3 d2e1 b8b2 e3d2 c6a5 d2c1 g8b8 c1b2 b8b2 f4f5 d7b6 f5e6 f7e6 g4g5 b6a4 h3e6 a4c3 f3h4 b2c2 e1f1 a3f8 f1g2 f8g7 f2g4 c2g2 h4g2 a5b3 g2f4 b3d2 a1b1 g7f8 b1b7 f8f4 b7b8 h8g7 b8g8",
    }

    let res = fill_ofs_stats(lines, game)
    console.log(res)
})