"use client"

import { power } from "@/lib/sim/engine"
import { ACTION_LABELS, type Faction, type World } from "@/lib/sim/types"
import { Coins, Crown, Landmark, Skull, Swords, Users, Wheat } from "lucide-react"

export function FactionCard({
  faction: f,
  world,
  selected,
  onSelect,
  maxPower,
}: {
  faction: Faction
  world: World
  selected: boolean
  onSelect: () => void
  maxPower: number
}) {
  const pw = power(f)
  const warCount = world.wars[f.id].filter(Boolean).length
  const allyCount = world.alliances[f.id].filter(Boolean).length

  if (!f.alive) {
    const conq = f.conqueredBy !== null ? world.factions[f.conqueredBy] : null
    return (
      <div className="rounded-lg border border-border bg-card/40 p-3 opacity-50">
        <div className="flex items-center gap-2">
          <Skull className="size-4 text-muted-foreground" aria-hidden />
          <span className="font-serif text-base line-through">{f.species.name}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {`Пали в году ${f.diedYear}`}
          {conq ? `, покорены народом «${conq.species.name}»` : ""}
        </p>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full rounded-lg border p-3 text-left transition-colors ${
        selected
          ? "border-primary/60 bg-accent"
          : "border-border bg-card hover:bg-accent/60"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="size-3 shrink-0 rounded-full"
            style={{ backgroundColor: f.species.color }}
            aria-hidden
          />
          <span className="font-serif text-lg leading-none truncate">
            {f.species.name}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          {warCount > 0 && (
            <span className="flex items-center gap-0.5 text-destructive">
              <Swords className="size-3" aria-hidden />
              {warCount}
            </span>
          )}
          {allyCount > 0 && (
            <span className="flex items-center gap-0.5 text-chart-2">
              <Crown className="size-3" aria-hidden />
              {allyCount}
            </span>
          )}
        </div>
      </div>

      <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
        {f.species.epithet} · {f.leader.name}, {f.leader.trait}
      </p>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(100, (pw / Math.max(1, maxPower)) * 100)}%`,
            backgroundColor: f.species.color,
          }}
        />
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1" title="Население">
          <Users className="size-3" aria-hidden />
          {Math.floor(f.population)}
        </span>
        <span className="flex items-center gap-1" title="Армия">
          <Swords className="size-3" aria-hidden />
          {Math.floor(f.military)}
        </span>
        <span className="flex items-center gap-1" title="Казна">
          <Coins className="size-3" aria-hidden />
          {Math.floor(f.wealth)}
        </span>
        <span className="flex items-center gap-1" title="Провинции">
          <Landmark className="size-3" aria-hidden />
          {f.territory}
        </span>
      </div>

      {f.lastAction && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px]">
          <Wheat className="size-3 text-primary" aria-hidden />
          <span className="text-primary">{ACTION_LABELS[f.lastAction.action]}</span>
          {f.lastAction.target !== null && f.lastAction.action !== "develop" && (
            <span className="text-muted-foreground truncate">
              {"→ "}
              {world.factions[f.lastAction.target].species.name}
            </span>
          )}
        </p>
      )}
    </button>
  )
}
