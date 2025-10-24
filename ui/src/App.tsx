import { lazy, type JSX } from 'solid-js'
import './App.scss'
import { Router, Route, A } from '@solidjs/router'

import SectionOpenings from './sections/SectionOpenings'
import SectionChallenges from './sections/SectionChallenges'

const MainLegal = lazy(() => import('./misc/MainLegal'))
const Main404 = lazy(() => import('./misc/Main404'))
const MainAbout = lazy(() => import('./misc/MainAbout'))
const MainContact = lazy(() => import('./misc/MainContact'))

function App() {
  return (<>

      <Router root={Layout}>
        <Route path="/" component={MainHome} />
        <Route path="/about" component={MainAbout} />
        <Route path="/legal" component={MainLegal} />
        <Route path="/contact" component={MainContact} />
        <Route path="*" component={Main404}/>
      </Router>

  </>)
}

function Layout(props: { children?: JSX.Element }) {

  return (<>
    <div class='main-wrap'>
      {props.children}
    </div>

  </>)
}

export default App

function MainHome() {
  return (<>
    <main class='main'>
      <h1><A class="title" href='/'>LineChess<small class='com'>.com</small></A></h1>
      <p> Explore, Build, and Share opening lines.</p>
      <p> Complete Challenges on a unique Skill Tree. </p>
      <p> Compete on the Leaderboards. </p>
      <p> Free, Open Source, No Ads, No Trackers.</p>
      <p>For the 💔 of Chess</p>
      <p><small><A href='/lichess'>Login with Lichess</A> to make your data publicly available.</small></p>

      <section class='section-openings'>
        <h2>Openings</h2>
        <SectionOpenings/>
      </section>
      <section class='section-challenges'>
        <h2>Challenges</h2>
        <SectionChallenges/>
      </section>
    </main>
    <footer>
      <A href="/">LineChess.com</A>
      •
      <A href="/about">About</A>
      •
      <A href="/legal">Legal</A>
      •
      <A href="/contact">Contact</A>
    </footer>
  </>)
}