import { createMemo, createSelector, createSignal, For, Show } from 'solid-js'
import './SectionChallenges.scss'
import { useLichessStore } from '../state/OpeningsStore2'
import { API_ENDPOINT } from '../state/create_agent'
import type { OFS_Stats, OFS_Stats_Query, OFS_Stats_Query_With_Stats, OpeningsLineId } from '../state/types'
import Icon, { type Icon as IconType, Icons } from '../components/Icon'
import DailyTimeAgo from '../components/TimeAgo'
import { ucis_to_sans } from '../logic/chess'
import { ply_to_index_omit_black } from '../components/steps'
import { makePersisted } from '@solid-primitives/storage'
import { Dynamic } from 'solid-js/web'

export const SectionChallenges = () => {

    const [state] = useLichessStore()

    type Tab = 'bullet' | 'blitz' | 'rapid' | 'classical'

    const [tab, set_tab] = makePersisted(createSignal<Tab>('rapid'), {
        name: '.linechess.challenges-tab'
    })

    const is_tab = createSelector(tab)

    const get_ofs_list_all = createMemo(() => {
        return state.daily_ofs_stats?.pages ?? []
    })

    const get_ofs_list = createMemo(() => {

        let t = tab()
        return get_ofs_list_all().filter(_ => _.time_control === t)
    })

    const [selected_ofs_game_id, set_selected_ofs_game_id] = makePersisted(createSignal<string | undefined>(undefined), {
        name: '.linechess.selected-ofs-game-id'
    })

    const selected_ofs_game = createMemo(() => get_ofs_list().find(_ => _.id === selected_ofs_game_id()))


    const get_tab_icon = createMemo(() => {
        switch (tab()) {
            case 'bullet':
                return Icons.Bullet
            case 'blitz':
                return Icons.Blitz
            case 'rapid':
                return Icons.Rapid
            case 'classical':
                return Icons.Classic
        }
    })

    const aggregate_ofs = (ofs: OFS_Stats[]) =>
        ofs.reduce((acc, item, index) => (acc + item.ofs / 100) / (index + 1), 0)
    

    const DailyOFS = createMemo(() => {

        let bullet = get_ofs_list_all().filter(_ => _.time_control === 'bullet')
        let blitz = get_ofs_list_all().filter(_ => _.time_control === 'blitz')
        let rapid = get_ofs_list_all().filter(_ => _.time_control === 'rapid')
        let classical = get_ofs_list_all().filter(_ => _.time_control === 'classical')

        let nb_bullet = bullet.length
        let acc_bullet = aggregate_ofs(bullet)

        let nb_blitz = blitz.length
        let acc_blitz = aggregate_ofs(blitz)


        let nb_rapid = rapid.length
        let acc_rapid = aggregate_ofs(rapid)


        let nb_classical = classical.length
        let acc_classical = aggregate_ofs(classical)

        const max_bullet = 15
        const max_blitz = 20
        const max_rapid = 10
        const max_classical = 1


        let raw_bullet = acc_bullet * (0.8 + 2 * Math.min(nb_bullet / max_bullet, 1))
        let raw_blitz = acc_blitz * (0.8 + 2 * Math.min(nb_blitz / max_blitz, 1))
        let raw_rapid = acc_rapid * (0.8 + 2 * Math.min(nb_rapid / max_rapid, 1))
        let raw_classical = acc_classical * (0.8 + 2 * Math.min(nb_classical / max_classical, 1))

        let raw = raw_bullet * 0.3 +
        raw_blitz * 0.3 +
        raw_rapid * 0.3 +
        raw_classical * 0.1

        return { ofs: raw * 100, raw_bullet, raw_blitz, raw_rapid, raw_classical }
    })

    const tab_bar_width_style = createMemo(() => {
        let width = 0
        switch (tab()) {
            case 'bullet': 
                width = DailyOFS().raw_bullet
                break
            case 'blitz': 
                width = DailyOFS().raw_blitz
                break
            case 'rapid': 
                width = DailyOFS().raw_rapid
                break
            case 'classical': 
                width = DailyOFS().raw_classical
                break
        }
        return `width: ${width*100}%;`
    })

    return (<>
    <div class='challenges'>
            <Show when={state.username} fallback={
                <span><a href={`${API_ENDPOINT}/auth/lichess`}>Login with Lichess</a> to particapate in challenges.</span>
            }>{username =>
                <>
                <h3>Welcome {username()}</h3>
                <p class='summary'>Daily Chess Fitness Score: {Math.floor(DailyOFS().ofs)}%</p>
                <p>Chess Fitness Score uses a formula to calculate how well you played your preparation on Lichess for Today.</p>
                <small>Your preparation is the opening lines you have saved above. The more lines you encounter and follow in your games the higher your score will be.</small>
                <small class='left'>Below is a breakdown of the formula for individual games, played today, over various time controls.</small>
                <div class='formula'>
                    <div class='tabs-wrap'>
                        <div class='tabs'>
                            <div onClick={() => set_tab('bullet')} class='tab' classList={{ active: is_tab('bullet') }}><Icon icon={Icons.Bullet} /> Bullet</div>
                            <div onClick={() => set_tab('blitz')} class='tab' classList={{ active: is_tab('blitz') }}><Icon icon={Icons.Blitz} /> Blitz</div>
                            <div onClick={() => set_tab('rapid')} class='tab' classList={{ active: is_tab('rapid') }}><Icon icon={Icons.Rapid} /> Rapid</div>
                            <div onClick={() => set_tab('classical')} class='tab' classList={{ active: is_tab('classical') }}><Icon icon={Icons.Classic} /> Classical</div>
                        </div>
                        <div class='tabs-content'>
                            <div class='table-wrap'>
                            <OFSList selected_item={selected_ofs_game()} on_selected_item={_ => set_selected_ofs_game_id(_.id)} list={get_ofs_list()} icon={get_tab_icon()} />
                                    </div>
                            <div class='gap'></div>
                            <div class='total'>
                                <div class='bar'><div class='progress' style={tab_bar_width_style()}></div></div>
                            </div>
                        </div>
                    </div>
                    <div class='panel-wrap'>
                        <div class='panel'>
                            <OFS_LightModelInfo id={selected_ofs_game()?.best_match_line_id} nb_deviation={selected_ofs_game()?.nb_deviation}/>
                        </div>
                    </div>
                    <div class='lichess-embed'>
                        <Show when={selected_ofs_game()}>{game =>
                            <iframe title='lichess-game' src={`https://lichess.org/embed/game/${game().id}?theme=auto&bg=dark`}
                                width={460} height={306}></iframe>
                        }</Show>
                    </div>
                </div>
                <div>
                    <small>Your standard daily games should be shown automatically after a while, be patient.</small>
                </div>
                    </>
                }</Show>
    </div>
    </>)
}

function OFS_LightModelInfo(props: { id?: OpeningsLineId, nb_deviation?: number }) {

    const [state] = useLichessStore()

    const get_lines = createMemo(() => state.daily_ofs_stats?.lines ?? [])

    const line = createMemo(() => get_lines().find(_ => _._id === props.id))

    const nb_deviation = createMemo(() => props.nb_deviation ?? 0)

    return (<>
    <div class='light-info'>
        <Show when={line()}>{ line => 
                <>
                <div class="title">
                    <span class='playlist'>{line().playlist_name}</span>
                    <span class='line'>{line().slot + 1}. {line().name}</span>
                </div>
                    <div class='moves-wrap'>
                        <div class='list'>
                        <For each={ucis_to_sans(line().moves.split(' '))}>{ (item, index) => 
                            <>
                                <Show when={index() % 2 === 0}>
                                    <span class='index'>{ply_to_index_omit_black(index() + 1)}</span>
                                </Show>
                                <span class='move' classList={{solid: index() < nb_deviation()}}>{item}</span>
                            </>
                            }</For>
                        </div>
                    </div>
                </>
        }</Show>
    </div>
    </>)
}

function OFSList(props: { selected_item?: OFS_Stats_Query_With_Stats, list: OFS_Stats_Query_With_Stats[], on_selected_item: (item: OFS_Stats_Query) => void, icon: IconType }) {

    const isSelected = createSelector(() => props.selected_item)

    return (<>
        <table class='table'>
            <thead>
                <tr>
                <th>Speed</th>
                <th>Players</th>
                <th>Date</th>
                <th>Result</th>
                <th>Fitness Score</th>
                </tr>
            </thead>
            <tbody>
            <For each={props.list}>{item =>
                <tr classList={{active: isSelected(item)}} onClick={() => props.on_selected_item(item)} class='item'>
                    <td><Icon icon={props.icon}/></td>
                    <td>{item.you} vs {item.opponent}</td>
                    <td><span class='time'><DailyTimeAgo time={item.created_at}/> </span></td>
                    <td><span class='result'><Dynamic component={result_icons[item.did_you_win ? 'win' : item.did_you_lose ? 'lose' : 'draw']}/></span></td>
                    <td><span class='score'>{Math.floor(item.ofs)}%</span></td>
                </tr>
            }</For>
            </tbody>
        </table>
    </>)
}

const result_icons = {
    win: () => <span class='win'><Icon icon={Icons.RatingUp}/></span>,
    lose: () => <span class='lose'><Icon icon={Icons.RatingDown}/></span>,
    draw: () => <span class='draw'>1/2</span>
}