"use client"

import type { World } from "@/lib/sim/types"

function cellColor(rel: number, war: boolean, ally: boolean): string {
  if (war) return "oklch(0.45 0.16 28)"
  if (ally) return "oklch(0.5 0.1 145)"
  if (rel > 30) return "oklch(0.38 0.06 145)"
  if (rel < -25) return "oklch(0.34 0.08 28)"
  return "oklch(0.26 0.01 60)"
}

export function RelationsMatrix({ world }: { world: World }) {
  const alive = world.factions.filter((f) => f.alive)

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="font-serif text-lg">Отношения</h2>
      <p className="text-xs text-muted-foreground">
        Красное — война, зелёное — союз или дружба
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="border-separate border-spacing-0.5">
          <thead>
            <tr>
              <th aria-hidden className="size-5" />
              {alive.map((f) => (
                <th key={f.id} scope="col" className="size-5 p-0">
                  <span
                    title={f.species.name}
                    className="block size-4 rounded-sm mx-auto"
                    style={{ backgroundColor: f.species.color }}
                  >
                    <span className="sr-only">{f.species.name}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {alive.map((row) => (
              <tr key={row.id}>
                <th scope="row" className="size-5 p-0">
                  <span
                    title={row.species.name}
                    className="block size-4 rounded-sm"
                    style={{ backgroundColor: row.species.color }}
                  >
                    <span className="sr-only">{row.species.name}</span>
                  </span>
                </th>
                {alive.map((col) => {
                  if (row.id === col.id)
                    return <td key={col.id} className="size-5 p-0" aria-hidden />
                  const rel = Math.round(world.relations[row.id][col.id])
                  const war = world.wars[row.id][col.id]
                  const ally = world.alliances[row.id][col.id]
                  const married = world.marriages.some(
                    (m) =>
                      (m.a === row.id && m.b === col.id) ||
                      (m.a === col.id && m.b === row.id),
                  )
                  return (
                    <td key={col.id} className="size-5 p-0">
                      <span
                        title={`${row.species.name} ↔ ${col.species.name}: ${rel}${war ? " (война)" : ""}${ally ? " (союз)" : ""}${married ? " (родство)" : ""}`}
                        className="flex size-5 items-center justify-center rounded-sm text-[9px] text-foreground/80"
                        style={{ backgroundColor: cellColor(rel, war, ally) }}
                      >
                        {married ? "❦" : war ? "×" : ally ? "✦" : ""}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {"× война · ✦ союз · ❦ династический брак"}
      </p>
    </div>
  )
}
