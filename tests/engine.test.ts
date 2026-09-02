import { describe, expect, it } from "vitest"

import { createWorld, power, qKey, tick } from "../lib/sim/engine"
import { ACTIONS } from "../lib/sim/types"

describe("simulation engine", () => {
  it("creates a complete, symmetric ten-faction world", () => {
    const world = createWorld()

    expect(world.factions).toHaveLength(10)
    expect(world.relations).toHaveLength(10)
    expect(world.history).toHaveLength(10)
    expect(world.historyYears).toEqual([1])

    for (let i = 0; i < world.factions.length; i++) {
      expect(world.factions[i].id).toBe(i)
      expect(Object.keys(world.factions[i].q)).toHaveLength(5 * 3 * ACTIONS.length)
      expect(world.history[i]).toEqual([power(world.factions[i])])

      for (let j = 0; j < world.factions.length; j++) {
        expect(world.relations[i][j]).toBe(world.relations[j][i])
        expect(world.wars[i][j]).toBe(world.wars[j][i])
        expect(world.alliances[i][j]).toBe(world.alliances[j][i])
        expect(world.tradePacts[i][j]).toBe(world.tradePacts[j][i])
      }
    }
  })

  it("uses stable, inspectable Q-table keys", () => {
    expect(qKey("hostile", "stronger", "diplomacy")).toBe(
      "hostile|stronger|diplomacy",
    )
  })

  it("advances the world while preserving relation and pact symmetry", () => {
    const world = createWorld()
    const previousYear = world.year
    const previousHistoryLength = world.historyYears.length

    tick(world)

    expect(world.year).toBe(previousYear + 1)
    expect(world.historyYears).toHaveLength(previousHistoryLength + 1)
    expect(world.factions.reduce((sum, faction) => sum + faction.updates, 0)).toBeGreaterThan(0)

    for (let i = 0; i < world.factions.length; i++) {
      expect(world.history[i]).toHaveLength(world.historyYears.length)
      for (let j = 0; j < world.factions.length; j++) {
        expect(world.relations[i][j]).toBe(world.relations[j][i])
        expect(world.relations[i][j]).toBeGreaterThanOrEqual(-100)
        expect(world.relations[i][j]).toBeLessThanOrEqual(100)
        expect(world.wars[i][j]).toBe(world.wars[j][i])
        expect(world.alliances[i][j]).toBe(world.alliances[j][i])
        expect(world.tradePacts[i][j]).toBe(world.tradePacts[j][i])
      }
    }
  })

  it("does not mutate a finished world", () => {
    const world = createWorld()
    world.finished = true
    const before = structuredClone(world)

    expect(tick(world)).toBe(world)
    expect(world).toEqual(before)
  })
})
