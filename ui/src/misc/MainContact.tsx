import { A } from "@solidjs/router";
import './MainLegal.scss'
import Spoiler from "../components/Spoiler";


export default function MainContact() {


  return (<>
    <main class='main contact'>
      <h1>Contact</h1>
      <p>For business inquires, and legal issues, click to reveal email: <Spoiler text={'iplaythefrench@gmail.com'}/></p>
      <p>For feature requests and bug reports, please open an issue at: <a rel="noopener" target="_blank" href="https://github.com/eguneys/linechess-26/issues">https://github.com/eguneys/linechess-26/issues</a></p>
      <footer>
        <A href="/">Go back Home</A>
      </footer>
    </main></>)
}

