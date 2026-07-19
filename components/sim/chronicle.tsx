"use client"

import type { EventKind, World } from "@/lib/sim/types"
import { useEffect, useRef, useState } from "react"

const KIND_STYLE: Record<EventKind, string> = {
  war: "text-destructive",
  battle: "text-destructive",
  betrayal: "text-destructive",
  conquest: "text-destructive",
  raid: "text-chart-3",
  peace: "text-chart-2",
  diplomacy: "text-chart-2",
  marriage: "text-primary",
  trade: "text-chart-4",
  death: "text-muted-foreground",
  succession: "text-foreground",
  disaster: "text-chart-3",
  develop: "text-muted-foreground",
  world: "text-primary",
}

const KIND_LABEL: Record<EventKind, string> = {
  war: "Война",
  battle: "Битва",
  betrayal: "Предательство",
  conquest: "Завоевание",
  raid: "Набег",
  peace: "Мир",
  diplomacy: "Дипломатия",
  marriage: "Свадьба",
  trade: "Торговля",
  death: "Смерть",
  succession: "Наследие",
  disaster: "Бедствие",
  develop: "Развитие",
  world: "Мир Эрдалиона",
}

export function Chronicle({ world }: { world: World }) {
  const ref = useRef<HTMLDivElement>(null)
  const [onlyImportant, setOnlyImportant] = useState(false)

  const events = onlyImportant
    ? world.events.filter((e) => e.important)
    : world.events

  useEffect(() => {
    const el = ref.current
    if (el) el.scrollTop = el.scrollHeight
  }, [world.events.length, onlyImportant])

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h2 className="font-serif text-lg">Летопись</h2>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={onlyImportant}
            onChange={(e) => setOnlyImportant(e.target.checked)}
            className="accent-[var(--primary)]"
          />
          Только ключевые события
        </label>
      </div>
      <div ref={ref} className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <ol className="flex flex-col gap-2.5">
          {events.slice(-160).map((e) => (
            <li key={e.id} className="text-sm leading-relaxed">
              <div className="flex items-center gap-2">
                <span className="font-serif text-xs text-muted-foreground tabular-nums">
                  {e.year} г.
                </span>
                <span className={`text-[10px] uppercase tracking-wider ${KIND_STYLE[e.kind]}`}>
                  {KIND_LABEL[e.kind]}
                </span>
                <span className="flex gap-1" aria-hidden>
                  {e.actors.slice(0, 3).map((id) => (
                    <span
                      key={id}
                      className="size-2 rounded-full"
                      style={{
                        backgroundColor: world.factions[id].species.color,
                      }}
                    />
                  ))}
                </span>
              </div>
              <p className={e.important ? "text-foreground" : "text-muted-foreground"}>
                {e.text}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
