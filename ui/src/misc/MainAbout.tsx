import { A } from "@solidjs/router";
import './MainLegal.scss'


export default function MainAbout() {
  return (<>
    <main class='main about'>
      <h1>About Linechess</h1>
      <p>
        linechess.com is a free, open source chess platform, 
        to allow sharing of chess opening lines, create playlists, 
        participate in chess challenges via your Lichess.org activity,
        and track your progress on public leaderboards.
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

