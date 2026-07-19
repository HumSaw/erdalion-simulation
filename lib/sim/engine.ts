import { SPECIES } from "./species-data"
import {
  ACTIONS,
  type ActionType,
  type Faction,
  type Leader,
  type LeaderTrait,
  type PowBucket,
  type RelBucket,
  type SimEvent,
  type World,
} from "./types"

// ---------- helpers ----------

const rnd = Math.random
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]
const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v))

const TRAITS: LeaderTrait[] = [
  "воинственный",
  "мудрый",
  "алчный",
  "милосердный",
  "коварный",
  "харизматичный",
]

function makeLeader(speciesId: number): Leader {
  const s = SPECIES[speciesId]
  return {
    name: pick(s.leaderNames),
    age: 20 + Math.floor(rnd() * 25),
    trait: pick(TRAITS),
  }
}

export function power(f: Faction): number {
  if (!f.alive) return 0
  return (
    f.military * f.species.might * 1.5 +
    f.population * 0.3 +
    f.wealth * 0.4 +
    f.territory * 8
  )
}

function relBucket(rel: number, atWar: boolean, allied: boolean): RelBucket {
  if (atWar) return "war"
  if (allied) return "ally"
  if (rel < -25) return "hostile"
  if (rel > 30) return "friendly"
  return "neutral"
}

function powBucket(me: number, them: number): PowBucket {
  const r = them / Math.max(1, me)
  if (r < 0.75) return "weaker"
  if (r > 1.35) return "stronger"
  return "even"
}

export const qKey = (r: RelBucket, p: PowBucket, a: ActionType) =>
  `${r}|${p}|${a}`

// ---------- initialization ----------

function initQ(species: (typeof SPECIES)[number]): Record<string, number> {
  const q: Record<string, number> = {}
  const rels: RelBucket[] = ["war", "hostile", "neutral", "friendly", "ally"]
  const pows: PowBucket[] = ["weaker", "even", "stronger"]
  for (const r of rels) {
    for (const p of pows) {
      for (const a of ACTIONS) {
        // small species-flavored priors + noise so learning diverges
        let v = (rnd() - 0.5) * 0.2
        if (a === "attack" || a === "raid") v += species.aggression * 0.5 - 0.15
        if (a === "diplomacy" || a === "marriage")
          v += species.cunning * 0.4 - 0.1
        if (a === "trade") v += species.industry * 0.3 - 0.1
        if (a === "develop") v += 0.1
        if (p === "stronger" && a === "attack") v -= 0.3
        if (r === "ally" && a === "attack") v -= 0.4
        q[qKey(r, p, a)] = v
      }
    }
  }
  return q
}

export function createWorld(): World {
  const factions: Faction[] = SPECIES.map((s) => ({
    id: s.id,
    species: s,
    alive: true,
    population: 800 + Math.floor(rnd() * 400),
    military: 150 + Math.floor(rnd() * 100),
    wealth: 300 + Math.floor(rnd() * 200),
    food: 500,
    territory: 10,
    leader: makeLeader(s.id),
    q: initQ(s),
    epsilon: 0.4,
    updates: 0,
    lastAction: null,
    kills: 0,
    diedYear: null,
    conqueredBy: null,
  }))

  const n = factions.length
  const relations = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) =>
      i === j ? 100 : Math.floor((rnd() - 0.55) * 60),
    ),
  )
  // symmetrize
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) relations[j][i] = relations[i][j]

  const mkGrid = () =>
    Array.from({ length: n }, () => Array.from({ length: n }, () => false))

  return {
    year: 1,
    factions,
    relations,
    wars: mkGrid(),
    alliances: mkGrid(),
    tradePacts: mkGrid(),
    marriages: [],
    events: [
      {
        id: 0,
        year: 1,
        kind: "world",
        text: "Десять народов пробуждаются в раздробленном мире Эрдалион. Летопись начинается.",
        actors: [],
        important: true,
      },
    ],
    eventId: 1,
    history: factions.map((f) => [power(f)]),
    historyYears: [1],
    finished: false,
    winner: null,
  }
}

// ---------- events ----------

function addEvent(
  w: World,
  kind: SimEvent["kind"],
  text: string,
  actors: number[],
  important = false,
) {
  w.events.push({ id: w.eventId++, year: w.year, kind, text, actors, important })
  if (w.events.length > 400) w.events.splice(0, w.events.length - 400)
}

// ---------- learning ----------

function chooseAction(
  f: Faction,
  r: RelBucket,
  p: PowBucket,
  valid: ActionType[],
): ActionType {
  if (rnd() < f.epsilon) return pick(valid)
  let best = valid[0]
  let bestV = -Infinity
  for (const a of valid) {
    const v = f.q[qKey(r, p, a)] ?? 0
    if (v > bestV) {
      bestV = v
      best = a
    }
  }
  return best
}

function learn(
  f: Faction,
  r: RelBucket,
  p: PowBucket,
  a: ActionType,
  reward: number,
) {
  const k = qKey(r, p, a)
  const lr = 0.18
  f.q[k] = (f.q[k] ?? 0) + lr * (reward - (f.q[k] ?? 0))
  f.updates++
  f.epsilon = Math.max(0.05, f.epsilon * 0.998)
}

// ---------- action resolution ----------

function setRel(w: World, a: number, b: number, delta: number) {
  w.relations[a][b] = clamp(w.relations[a][b] + delta, -100, 100)
  w.relations[b][a] = w.relations[a][b]
}

function alliesOf(w: World, id: number): number[] {
  return w.factions
    .filter((f) => f.alive && f.id !== id && w.alliances[id][f.id])
    .map((f) => f.id)
}

function marriageBond(w: World, a: number, b: number): boolean {
  return w.marriages.some(
    (m) => (m.a === a && m.b === b) || (m.a === b && m.b === a),
  )
}

function eliminate(w: World, victim: Faction, conqueror: Faction) {
  victim.alive = false
  victim.diedYear = w.year
  victim.conqueredBy = conqueror.id
  conqueror.kills++
  conqueror.territory += Math.max(0, victim.territory)
  conqueror.wealth += victim.wealth * 0.5
  conqueror.population += Math.floor(victim.population * 0.3)
  victim.territory = 0
  victim.population = 0
  victim.military = 0
  const n = w.factions.length
  for (let i = 0; i < n; i++) {
    w.wars[victim.id][i] = w.wars[i][victim.id] = false
    w.alliances[victim.id][i] = w.alliances[i][victim.id] = false
    w.tradePacts[victim.id][i] = w.tradePacts[i][victim.id] = false
  }
  addEvent(
    w,
    "conquest",
    `${victim.species.epithet} пал! ${conqueror.species.name} (${conqueror.species.epithet}) стирают ${victim.species.plural} с карты мира. Последние из народа склоняются перед ${conqueror.leader.name}.`,
    [victim.id, conqueror.id],
    true,
  )
}

function resolveBattle(
  w: World,
  atk: Faction,
  def: Faction,
): { atkWon: boolean; reward: number } {
  const defAllies = alliesOf(w, def.id)
  let defStr = def.military * def.species.might * (0.8 + rnd() * 0.5)
  defStr *= 1.15 // defender bonus
  for (const aid of defAllies) {
    const ally = w.factions[aid]
    if (!w.wars[aid][atk.id]) {
      w.wars[aid][atk.id] = w.wars[atk.id][aid] = true
      setRel(w, aid, atk.id, -30)
      addEvent(
        w,
        "war",
        `${ally.species.name} верны союзу: ${ally.leader.name} вступает в войну против ${atk.species.plural}, защищая ${def.species.plural}.`,
        [aid, atk.id, def.id],
        true,
      )
    }
    defStr += ally.military * ally.species.might * 0.35
  }
  const atkStr =
    atk.military *
    atk.species.might *
    (0.8 + rnd() * 0.5) *
    (atk.leader.trait === "воинственный" ? 1.15 : 1)

  const atkWon = atkStr > defStr
  const intensity = Math.min(atkStr, defStr) / Math.max(atkStr, defStr)

  const atkLoss = Math.floor(atk.military * (atkWon ? 0.12 : 0.3) * (0.5 + intensity))
  const defLoss = Math.floor(def.military * (atkWon ? 0.3 : 0.12) * (0.5 + intensity))
  atk.military = Math.max(0, atk.military - atkLoss)
  def.military = Math.max(0, def.military - defLoss)
  atk.population = Math.max(0, atk.population - atkLoss)
  def.population = Math.max(0, def.population - Math.floor(defLoss * 1.5))

  let reward: number
  if (atkWon) {
    const terr = Math.min(def.territory, 1 + Math.floor(rnd() * 2))
    const loot = def.wealth * 0.2
    def.territory -= terr
    atk.territory += terr
    def.wealth -= loot
    atk.wealth += loot
    reward = 0.6 + terr * 0.25 - atkLoss / Math.max(1, atk.military + atkLoss)
    addEvent(
      w,
      "battle",
      `Битва при рубежах ${def.species.epithet}: ${atk.species.name} под знамёнами ${atk.leader.name} одерживают победу, захватывая ${terr} провинц${terr === 1 ? "ию" : "ии"} и обозы с золотом. Потери: ${atkLoss} против ${defLoss}.`,
      [atk.id, def.id],
      true,
    )
    if (def.territory <= 0 || def.population <= 30) eliminate(w, def, atk)
  } else {
    reward = -0.7 - atkLoss / Math.max(1, atk.military + atkLoss)
    addEvent(
      w,
      "battle",
      `${def.species.name} отбивают вторжение ${atk.species.plural}! Армия ${atk.leader.name} разбита и бежит, оставив ${atkLoss} павших.`,
      [def.id, atk.id],
      true,
    )
  }
  return { atkWon, reward }
}

function doAttack(w: World, f: Faction, t: Faction): number {
  if (!w.wars[f.id][t.id]) {
    const wasAllied = w.alliances[f.id][t.id]
    const wasMarried = marriageBond(w, f.id, t.id)
    w.wars[f.id][t.id] = w.wars[t.id][f.id] = true
    w.alliances[f.id][t.id] = w.alliances[t.id][f.id] = false
    w.tradePacts[f.id][t.id] = w.tradePacts[t.id][f.id] = false
    setRel(w, f.id, t.id, -50)
    if (wasAllied || wasMarried) {
      addEvent(
        w,
        "betrayal",
        `ПРЕДАТЕЛЬСТВО! ${f.species.name} разрывают ${wasMarried ? "кровные узы и " : ""}союз: ${f.leader.name} ${f.leader.trait === "коварный" ? "с холодной усмешкой " : ""}вонзает нож в спину ${t.species.plural}. Мир содрогается.`,
        [f.id, t.id],
        true,
      )
      // everyone distrusts a traitor
      for (const o of w.factions)
        if (o.alive && o.id !== f.id && o.id !== t.id) setRel(w, f.id, o.id, -12)
    } else {
      addEvent(
        w,
        "war",
        `${f.species.epithet} объявляет войну ${t.species.epithet}! ${f.leader.name} ведёт ${f.species.plural} в поход.`,
        [f.id, t.id],
        true,
      )
    }
  }
  const { reward } = resolveBattle(w, f, t)
  return reward
}

function doRaid(w: World, f: Faction, t: Faction): number {
  const success =
    f.military * f.species.might * (0.7 + rnd() * 0.6) >
    t.military * t.species.might * 0.5
  setRel(w, f.id, t.id, -18)
  w.tradePacts[f.id][t.id] = w.tradePacts[t.id][f.id] = false
  if (success) {
    const loot = Math.min(t.wealth, 40 + rnd() * 80)
    t.wealth -= loot
    f.wealth += loot
    addEvent(
      w,
      "raid",
      `Набег: ${f.species.name} разоряют приграничные селения ${t.species.plural}, унося ${Math.floor(loot)} золота.`,
      [f.id, t.id],
    )
    return 0.3 + loot / 300
  }
  const loss = Math.floor(f.military * 0.08)
  f.military -= loss
  addEvent(
    w,
    "raid",
    `Набег ${f.species.plural} на земли ${t.species.plural} провалился — рейдеры перебиты дозорами.`,
    [t.id, f.id],
  )
  return -0.4
}

function doDiplomacy(w: World, f: Faction, t: Faction): number {
  const skill = f.species.cunning + (f.leader.trait === "харизматичный" ? 0.25 : 0)
  const gain = 8 + Math.floor(skill * 20 * rnd())
  setRel(w, f.id, t.id, gain)
  const rel = w.relations[f.id][t.id]

  if (w.wars[f.id][t.id] && rnd() < 0.35 + skill * 0.3) {
    w.wars[f.id][t.id] = w.wars[t.id][f.id] = false
    setRel(w, f.id, t.id, 15)
    addEvent(
      w,
      "peace",
      `Мирный договор: ${f.leader.name} и ${t.leader.name} подписывают перемирие между ${f.species.epithet} и ${t.species.epithet}.`,
      [f.id, t.id],
      true,
    )
    return 0.8
  }
  if (!w.alliances[f.id][t.id] && rel > 55 && rnd() < 0.4 + skill * 0.2) {
    w.alliances[f.id][t.id] = w.alliances[t.id][f.id] = true
    addEvent(
      w,
      "diplomacy",
      `Великий союз! ${f.species.name} и ${t.species.name} клянутся в вечной дружбе. Послы обмениваются дарами при дворе ${t.leader.name}.`,
      [f.id, t.id],
      true,
    )
    return 0.9
  }
  addEvent(
    w,
    "diplomacy",
    `Послы ${f.species.plural} прибывают ко двору ${t.leader.name}. Отношения теплеют (+${gain}).`,
    [f.id, t.id],
  )
  return 0.2 + gain / 60
}

function doTrade(w: World, f: Faction, t: Faction): number {
  if (w.relations[f.id][t.id] < -30 || w.wars[f.id][t.id]) {
    addEvent(
      w,
      "trade",
      `Караваны ${f.species.plural} развёрнуты на границе: ${t.species.name} отказываются торговать с врагом.`,
      [f.id, t.id],
    )
    return -0.3
  }
  const vol =
    (f.wealth + t.wealth) * 0.04 * f.species.industry * (0.7 + rnd() * 0.6)
  f.wealth += vol
  t.wealth += vol * 0.8
  setRel(w, f.id, t.id, 6)
  if (!w.tradePacts[f.id][t.id] && rnd() < 0.4) {
    w.tradePacts[f.id][t.id] = w.tradePacts[t.id][f.id] = true
    addEvent(
      w,
      "trade",
      `Торговый пакт: ${f.species.name} и ${t.species.name} открывают друг другу рынки. Золото течёт рекой.`,
      [f.id, t.id],
      true,
    )
  } else {
    addEvent(
      w,
      "trade",
      `Ярмарка на границе: купцы ${f.species.plural} и ${t.species.plural} наторговали на ${Math.floor(vol)} золота.`,
      [f.id, t.id],
    )
  }
  return 0.25 + vol / 250
}

function doMarriage(w: World, f: Faction, t: Faction): number {
  if (w.relations[f.id][t.id] < 10 || w.wars[f.id][t.id]) {
    addEvent(
      w,
      "marriage",
      `${t.leader.name} с презрением отвергает сватовство ${f.species.plural}: «Наша кровь не смешается с вашей».`,
      [t.id, f.id],
    )
    setRel(w, f.id, t.id, -8)
    return -0.35
  }
  if (marriageBond(w, f.id, t.id) && rnd() < 0.6) {
    setRel(w, f.id, t.id, 5)
    return 0.05
  }
  const bride = pick(f.species.princessNames)
  const groom = pick(t.species.leaderNames)
  const text = `${bride} из народа ${f.species.plural} выдана за ${groom}, наследника ${t.species.epithet}`
  w.marriages.push({ a: f.id, b: t.id, year: w.year, text })
  setRel(w, f.id, t.id, 30)
  let bonus = 0
  if (!w.alliances[f.id][t.id] && w.relations[f.id][t.id] > 45) {
    w.alliances[f.id][t.id] = w.alliances[t.id][f.id] = true
    bonus = 0.4
    addEvent(
      w,
      "marriage",
      `Династический брак! ${text}. Свадебный пир длится семь дней, и два народа скрепляют военный союз кровью.`,
      [f.id, t.id],
      true,
    )
  } else {
    addEvent(
      w,
      "marriage",
      `Свадьба: ${text}. Родственные узы связывают два дома.`,
      [f.id, t.id],
      true,
    )
  }
  return 0.5 + bonus
}

function doDevelop(w: World, f: Faction): number {
  const invest = f.wealth * 0.25
  f.wealth -= invest
  const roll = rnd()
  if (roll < 0.4) {
    const rec = Math.floor(invest * 0.8 + f.population * 0.03)
    f.military += rec
    addEvent(
      w,
      "develop",
      `${f.species.name} куют оружие и муштруют новобранцев: армия растёт на ${rec} бойцов.`,
      [f.id],
    )
  } else if (roll < 0.7) {
    f.food += invest * 1.5
    addEvent(
      w,
      "develop",
      `${f.species.name} распахивают новые угодья — амбары ${f.species.epithet} полнятся.`,
      [f.id],
    )
  } else {
    f.wealth += invest * (1.3 + f.species.industry * 0.4)
    addEvent(
      w,
      "develop",
      `Мастерские ${f.species.plural} процветают: караваны везут товары во все концы света.`,
      [f.id],
    )
  }
  return 0.25 + f.species.industry * 0.1
}

// ---------- world tick ----------

function passiveGrowth(w: World, f: Faction) {
  const foodPerCap = f.food / Math.max(1, f.population)
  const growth =
    f.population * 0.02 * f.species.fertility * clamp(foodPerCap, 0.2, 1.5)
  f.population = Math.floor(f.population + growth)
  f.food = Math.max(0, f.food + f.territory * 60 - f.population * 0.4)
  f.wealth += f.territory * 6 * f.species.industry
  // trade pacts income
  for (const o of w.factions)
    if (o.alive && w.tradePacts[f.id][o.id]) f.wealth += 8
  // upkeep
  f.wealth = Math.max(0, f.wealth - f.military * 0.15)
  if (f.food <= 0 && rnd() < 0.3) {
    const dead = Math.floor(f.population * 0.08)
    f.population -= dead
    addEvent(
      w,
      "disaster",
      `Голод терзает ${f.species.epithet}: ${dead} душ погибло. Народ ропщет на ${f.leader.name}.`,
      [f.id],
    )
  }
}

function leaderTick(w: World, f: Faction) {
  f.leader.age++
  const deathChance = f.leader.age > 60 ? (f.leader.age - 60) * 0.02 : 0.004
  if (rnd() < deathChance) {
    const old = f.leader
    f.leader = makeLeader(f.species.id)
    addEvent(
      w,
      "succession",
      `${old.name}, ${old.trait} владыка ${f.species.plural}, умирает в возрасте ${old.age} лет. Трон наследует ${f.leader.name} (${f.leader.trait}).`,
      [f.id],
      true,
    )
  }
}

function randomWorldEvent(w: World) {
  if (rnd() > 0.08) return
  const alive = w.factions.filter((f) => f.alive)
  if (alive.length === 0) return
  const f = pick(alive)
  const roll = rnd()
  if (roll < 0.3) {
    const dead = Math.floor(f.population * 0.12)
    f.population -= dead
    addEvent(
      w,
      "disaster",
      `Чума опустошает земли ${f.species.plural}: ${dead} жизней унесла Чёрная Хворь.`,
      [f.id],
      true,
    )
  } else if (roll < 0.5) {
    const loss = Math.floor(f.military * 0.15)
    f.military -= loss
    addEvent(
      w,
      "disaster",
      `Древний дракон пробудился в горах и сжёг гарнизоны ${f.species.plural}. Пало ${loss} воинов.`,
      [f.id],
      true,
    )
  } else if (roll < 0.75) {
    const gold = 100 + Math.floor(rnd() * 200)
    f.wealth += gold
    addEvent(
      w,
      "world",
      `Рудокопы ${f.species.plural} нашли богатую золотую жилу: казна пополнилась на ${gold} золота.`,
      [f.id],
    )
  } else {
    f.food += 400
    addEvent(
      w,
      "world",
      `Небывалый урожай в землях ${f.species.epithet} — амбары ломятся от зерна.`,
      [f.id],
    )
  }
}

function pickTarget(w: World, f: Faction): Faction | null {
  const others = w.factions.filter((o) => o.alive && o.id !== f.id)
  if (others.length === 0) return null
  // weight: enemies at war highest, then neighbors by |relation| extremity
  const weights = others.map((o) => {
    let wgt = 1
    if (w.wars[f.id][o.id]) wgt += 4
    wgt += Math.abs(w.relations[f.id][o.id]) / 50
    return wgt
  })
  const total = weights.reduce((a, b) => a + b, 0)
  let r = rnd() * total
  for (let i = 0; i < others.length; i++) {
    r -= weights[i]
    if (r <= 0) return others[i]
  }
  return others[others.length - 1]
}

export function tick(w: World): World {
  if (w.finished) return w
  w.year++

  const order = w.factions.filter((f) => f.alive).sort(() => rnd() - 0.5)

  for (const f of order) {
    if (!f.alive) continue
    passiveGrowth(w, f)
    leaderTick(w, f)
    if (!f.alive) continue

    const target = pickTarget(w, f)
    if (!target) break

    const r = relBucket(
      w.relations[f.id][target.id],
      w.wars[f.id][target.id],
      w.alliances[f.id][target.id],
    )
    const p = powBucket(power(f), power(target))

    const action = chooseAction(f, r, p, ACTIONS)
    f.lastAction = { action, target: target.id }

    let reward = 0
    switch (action) {
      case "attack":
        reward = doAttack(w, f, target)
        break
      case "raid":
        reward = doRaid(w, f, target)
        break
      case "diplomacy":
        reward = doDiplomacy(w, f, target)
        break
      case "trade":
        reward = doTrade(w, f, target)
        break
      case "marriage":
        reward = doMarriage(w, f, target)
        break
      case "develop":
        reward = doDevelop(w, f)
        break
    }
    learn(f, r, p, action, reward)
  }

  randomWorldEvent(w)

  // relation drift toward 0
  const n = w.factions.length
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      if (!w.factions[i].alive || !w.factions[j].alive) continue
      const drift = w.relations[i][j] > 0 ? -0.5 : 0.5
      if (!w.alliances[i][j] && !w.wars[i][j]) {
        w.relations[i][j] += drift
        w.relations[j][i] = w.relations[i][j]
      }
    }

  // history sample
  for (const f of w.factions) w.history[f.id].push(power(f))
  w.historyYears.push(w.year)
  if (w.historyYears.length > 300) {
    w.historyYears.shift()
    for (const h of w.history) h.shift()
  }

  // victory check
  const alive = w.factions.filter((f) => f.alive)
  if (alive.length === 1) {
    w.finished = true
    w.winner = alive[0].id
    addEvent(
      w,
      "world",
      `КОНЕЦ ЭПОХИ. ${alive[0].species.epithet} — единственная держава Эрдалиона. ${alive[0].species.name} правят миром, и летописцы закрывают хронику.`,
      [alive[0].id],
      true,
    )
  } else if (alive.length > 1) {
    const totalTerr = alive.reduce((s, f) => s + f.territory, 0)
    const top = alive.reduce((a, b) => (a.territory > b.territory ? a : b))
    if (top.territory / totalTerr > 0.7) {
      w.finished = true
      w.winner = top.id
      addEvent(
        w,
        "world",
        `ГЕГЕМОНИЯ. ${top.species.epithet} контролирует большую часть известного мира. ${top.leader.name} провозглашает себя Владыкой Эрдалиона.`,
        [top.id],
        true,
      )
    }
  }

  return w
}
