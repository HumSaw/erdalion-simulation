"use client"

import { qKey } from "@/lib/sim/engine"
import {
  ACTIONS,
  ACTION_LABELS,
  POW_BUCKETS,
  POW_LABELS,
  REL_BUCKETS,
  REL_LABELS,
  type Faction,
} from "@/lib/sim/types"
import { BrainCircuit } from "lucide-react"

export function BrainView({ faction: f }: { faction: Faction }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <BrainCircuit className="size-4 text-primary" aria-hidden />
        <h2 className="font-serif text-lg">
          Разум народа: {f.species.name}
        </h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Выученная стратегия (Q-обучение). Обновлений: {f.updates}, доля
        экспериментов ε = {f.epsilon.toFixed(2)}. Лучшая стратегия для каждой
        ситуации выделена.
      </p>

      <div className="mt-3 flex flex-col gap-3">
        {REL_BUCKETS.map((r) => (
          <div key={r}>
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {REL_LABELS[r]}
            </h3>
            <div className="mt-1 grid grid-cols-1 gap-1.5 md:grid-cols-3">
              {POW_BUCKETS.map((p) => {
                const vals = ACTIONS.map((a) => ({
                  a,
                  v: f.q[qKey(r, p, a)] ?? 0,
                }))
                const best = vals.reduce((x, y) => (y.v > x.v ? y : x))
                const min = Math.min(...vals.map((x) => x.v))
                const max = Math.max(...vals.map((x) => x.v))
                const span = Math.max(0.001, max - min)
                return (
                  <div
                    key={p}
                    className="rounded-md border border-border bg-background/50 p-2"
                  >
                    <p className="text-[10px] text-muted-foreground">
                      {POW_LABELS[p]}
                    </p>
                    <div className="mt-1 flex flex-col gap-0.5">
                      {vals.map(({ a, v }) => (
                        <div key={a} className="flex items-center gap-1.5">
                          <span
                            className={`w-24 shrink-0 text-[10px] ${a === best.a ? "text-primary font-medium" : "text-muted-foreground"}`}
                          >
                            {ACTION_LABELS[a]}
                          </span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${((v - min) / span) * 100}%`,
                                backgroundColor:
                                  a === best.a
                                    ? f.species.color
                                    : "oklch(0.4 0.01 60)",
                              }}
                            />
                          </div>
                          <span className="w-9 shrink-0 text-right text-[9px] tabular-nums text-muted-foreground">
                            {v.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
