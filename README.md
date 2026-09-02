# Chronicle of Erdalion

[![License: MIT](https://img.shields.io/badge/License-MIT-8a6d3b.svg)](LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-111827.svg)](https://nextjs.org/)

[Русская версия](README.ru.md)

An evolutionary self-learning simulation: 10 fantasy factions share one continent and learn to survive through wars, raids, diplomacy, trade, and dynastic marriages. Nobody scripts their behavior — each faction starts with rough instincts and adjusts its policy from the outcomes of its own decisions.

The simulation UI is in Russian (it is written as a fantasy chronicle); the engine code and this document are in English.

## How the learning works

Each faction maintains an independent tabular Q-function over a small discrete state space:

- **State** — relation to the target (`war / hostile / neutral / friendly / ally`) × relative power (`weaker / even / stronger`)
- **Actions** — `attack`, `raid`, `diplomacy`, `trade`, `marriage`, `develop`
- **Update** — incremental: `Q(s,a) += lr * (reward - Q(s,a))`
- **Exploration** — ε-greedy, starting at 0.4 and decaying by 0.998 per decision down to a 0.05 floor

Initial Q-values are seeded with species-flavored priors plus noise (aggressive species start biased toward violence, cunning ones toward diplomacy), so different runs and different factions diverge visibly. Rewards come from concrete outcomes: territory gained, army losses as a fraction of strength, wealth from trade, relation shifts from diplomacy and marriages.

The interesting part is watching aggressive species learn that attacking stronger neighbors is a losing policy — or fail to learn it and get erased from the map.

## What's in the world

- 10 species with distinct stats (might, cunning, fertility, industry, aggression): humans, ogres, elves, dark elves, dwarves, orcs, undead, deep folk, beastfolk, dragonborn
- Wars with battle resolution, territory transfer, and casualties
- Raids, trade agreements, diplomatic missions
- Dynastic marriages that bind factions together
- Leaders with ages, traits (warlike, wise, greedy, ...), succession on death
- A written chronicle of every major event, generated as the simulation runs

## UI panels

- **Faction cards** — live population, military, wealth, territory, current leader
- **Chronicle** — the running history of wars, treaties, and marriages
- **Relations matrix** — who is at war, allied, or married to whom
- **Power chart** — faction strength over time
- **Brain view** — the actual Q-table of a selected faction, so you can inspect what it has learned

## Running locally

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000. The whole simulation runs client-side; there is no backend.

## Verification

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

The engine tests cover world initialization, the complete Q-table state space,
relation and pact symmetry, yearly history sampling, and finished-world immutability.

## Project structure

```
lib/sim/
  engine.ts        # world tick, action resolution, Q-learning
  species-data.ts  # species definitions and priors
  types.ts         # world/faction/action types
components/sim/    # faction cards, chronicle, relations matrix, power chart, brain view
```

## License

[MIT](LICENSE)
