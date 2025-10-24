import { A } from "@solidjs/router";
import './MainLegal.scss'


export default function MainAbout() {
  return (<>
    <main class='main about'>
      <h1>About Linechess</h1>
      <p>Tired of forgetting your openings? LineChess is your solution.</p>

      <p>
        LineChess is a free and open-source platform that helps you master chess openings.
        Build your repertoire, organize lines into playlists, and share them effortlessly.
      </p>

      <p>
        Then, put your knowledge to the test.
        LineChess creates custom challenges from your Lichess.org activity—
        like solving puzzles or beating bots while using your playlists.
        Watch your progress grow in a visual skill tree and
        compete for glory on public leaderboards.
      </p>

      <p>
        Get a focused training routine without the distractions. 
        LineChess is free, has no ads, no trackers, 
        and only requires your Lichess login to unlock your potential.
      </p>
      <p class='center'>
        <span class='shine'>Please consider supporting the developer:</span>
        <a title="buymeacoffe" href="https://www.buymeacoffee.com/eguneys"><img alt="buymeacoffe" src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=eguneys&button_colour=FFDD00&font_colour=000000&font_family=Poppins&outline_colour=000000&coffee_colour=ffffff" /></a>
      </p>
      <footer>
        <A href="/">Go back Home</A>
      </footer>
    </main></>)
}

