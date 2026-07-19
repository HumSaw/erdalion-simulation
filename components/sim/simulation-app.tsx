"use client"

import { BrainView } from "@/components/sim/brain-view"
import { Chronicle } from "@/components/sim/chronicle"
import { FactionCard } from "@/components/sim/faction-card"
import { PowerChart } from "@/components/sim/power-chart"
import { RelationsMatrix } from "@/components/sim/relations-matrix"
import { createWorld, power, tick } from "@/lib/sim/engine"
import type { World } from "@/lib/sim/types"
import { FastForward, Pause, Play, RotateCcw } from "lucide-react"
import { useEffect, useReducer, useRef, useState } from "react"

const SPEEDS = [
  { label: "1×", ms: 900 },
  { label: "2×", ms: 450 },
  { label: "5×", ms: 180 },
  { label: "20×", ms: 45 },
]

export function SimulationApp() {
  const worldRef = useRef<World | null>(null)

  const [, force] = useReducer((x: number) => x + 1, 0)
  const [ready, setReady] = useState(false)
  const [running, setRunning] = useState(false)
  const [speedIdx, setSpeedIdx] = useState(1)
  const [selected, setSelected] = useState(0)

  // The world is generated with randomness, so it must be created
  // client-side only to avoid SSR hydration mismatches.
  useEffect(() => {
    if (!worldRef.current) {
      worldRef.current = createWorld()
      setReady(true)
    }
  }, [])

  useEffect(() => {
    if (!ready || !running) return
    const id = setInterval(() => {
      const w = worldRef.current
      if (!w) return
      tick(w)
      if (w.finished) setRunning(false)
      force()
    }, SPEEDS[speedIdx].ms)
    return () => clearInterval(id)
  }, [ready, running, speedIdx])

  const world = worldRef.current

  if (!ready || !world) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <p className="font-serif text-xl text-muted-foreground">
          Мир Эрдалиона рождается…
        </p>
      </div>
    )
  }
  const maxPower = Math.max(1, ...world.factions.map(power))
  const aliveCount = world.factions.filter((f) => f.alive).length
  const selectedFaction = world.factions[selected]?.alive
    ? world.factions[selected]
    : (world.factions.find((f) => f.alive) ?? world.factions[selected])

  const reset = () => {
    worldRef.current = createWorld()
    setRunning(false)
    setSelected(0)
    force()
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-6">
        <div>
          <h1 className="font-serif text-2xl leading-none text-primary">
            Летопись Эрдалиона
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Эволюционная симуляция · 10 народов учатся выживать
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-md border border-border bg-card px-3 py-1.5 text-sm tabular-nums">
            <span className="text-muted-foreground">Год </span>
            <span className="font-serif text-primary">{world.year}</span>
            <span className="text-muted-foreground"> · народов: {aliveCount}</span>
          </div>
          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            disabled={world.finished}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {running ? (
              <Pause className="size-4" aria-hidden />
            ) : (
              <Play className="size-4" aria-hidden />
            )}
            {running ? "Пауза" : "Запустить"}
          </button>
          <button
            type="button"
            onClick={() => setSpeedIdx((i) => (i + 1) % SPEEDS.length)}
            className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:bg-accent"
            aria-label={`Скорость: ${SPEEDS[speedIdx].label}`}
          >
            <FastForward className="size-4" aria-hidden />
            {SPEEDS[speedIdx].label}
          </button>
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:bg-accent"
          >
            <RotateCcw className="size-4" aria-hidden />
            Новый мир
          </button>
        </div>
      </header>

      {world.finished && world.winner !== null && (
        <div className="border-b border-primary/40 bg-primary/10 px-4 py-2 text-center text-sm md:px-6">
          <span className="font-serif text-primary">
            {`Эпоха завершена: «${world.factions[world.winner].species.epithet}» одержала верх в году ${world.year}.`}
          </span>{" "}
          <span className="text-muted-foreground">
            Нажмите «Новый мир», чтобы история пошла иным путём.
          </span>
        </div>
      )}

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 md:p-4 lg:grid-cols-[300px_1fr_minmax(340px,380px)] lg:overflow-hidden">
        <section
          aria-label="Народы"
          className="flex flex-col gap-2 lg:min-h-0 lg:overflow-y-auto"
        >
          {[...world.factions]
            .sort((a, b) => Number(b.alive) - Number(a.alive) || power(b) - power(a))
            .map((f) => (
              <FactionCard
                key={f.id}
                faction={f}
                world={world}
                selected={selected === f.id}
                onSelect={() => setSelected(f.id)}
                maxPower={maxPower}
              />
            ))}
        </section>

        <section aria-label="Летопись событий" className="min-h-[400px] lg:min-h-0">
          <Chronicle world={world} />
        </section>

        <section
          aria-label="Аналитика"
          className="flex flex-col gap-3 lg:min-h-0 lg:overflow-y-auto"
        >
          <PowerChart world={world} />
          <RelationsMatrix world={world} />
          <BrainView faction={selectedFaction} />
        </section>
      </main>
    </div>
  )
}
