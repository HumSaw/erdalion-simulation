"use client"

import type { World } from "@/lib/sim/types"

export function PowerChart({ world }: { world: World }) {
  const W = 600
  const H = 180
  const pad = 8

  const len = world.historyYears.length
  const maxV = Math.max(1, ...world.history.flatMap((h) => h))

  const paths = world.factions.map((f) => {
    const h = world.history[f.id]
    if (h.length < 2) return null
    const step = (W - pad * 2) / Math.max(1, len - 1)
    const d = h
      .map((v, i) => {
        const x = pad + i * step
        const y = H - pad - (v / maxV) * (H - pad * 2)
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(" ")
    return (
      <path
        key={f.id}
        d={d}
        fill="none"
        stroke={f.species.color}
        strokeWidth={f.alive ? 1.8 : 1}
        strokeOpacity={f.alive ? 0.95 : 0.3}
      />
    )
  })

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="font-serif text-lg">Могущество народов</h2>
      <p className="text-xs text-muted-foreground">
        {`Годы ${world.historyYears[0]}–${world.historyYears[len - 1]}`}
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 w-full"
        role="img"
        aria-label="График могущества фракций во времени"
      >
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="currentColor" strokeOpacity={0.15} />
        {paths}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {world.factions.map((f) => (
          <span
            key={f.id}
            className={`flex items-center gap-1 text-[11px] ${f.alive ? "text-muted-foreground" : "text-muted-foreground/40 line-through"}`}
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: f.species.color }}
              aria-hidden
            />
            {f.species.name}
          </span>
        ))}
      </div>
    </div>
  )
}
