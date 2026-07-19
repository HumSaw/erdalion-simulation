export type ActionType =
  | "attack"
  | "raid"
  | "diplomacy"
  | "trade"
  | "marriage"
  | "develop"

export const ACTIONS: ActionType[] = [
  "attack",
  "raid",
  "diplomacy",
  "trade",
  "marriage",
  "develop",
]

export const ACTION_LABELS: Record<ActionType, string> = {
  attack: "Война",
  raid: "Набег",
  diplomacy: "Дипломатия",
  trade: "Торговля",
  marriage: "Брачный союз",
  develop: "Развитие",
}

export type RelBucket = "war" | "hostile" | "neutral" | "friendly" | "ally"
export type PowBucket = "weaker" | "even" | "stronger"

export const REL_BUCKETS: RelBucket[] = [
  "war",
  "hostile",
  "neutral",
  "friendly",
  "ally",
]
export const POW_BUCKETS: PowBucket[] = ["weaker", "even", "stronger"]

export const REL_LABELS: Record<RelBucket, string> = {
  war: "Война",
  hostile: "Вражда",
  neutral: "Нейтралитет",
  friendly: "Дружба",
  ally: "Союз",
}

export const POW_LABELS: Record<PowBucket, string> = {
  weaker: "Он слабее",
  even: "Равные силы",
  stronger: "Он сильнее",
}

export interface SpeciesDef {
  id: number
  name: string
  plural: string
  color: string
  might: number // combat multiplier
  cunning: number // diplomacy skill
  fertility: number // population growth
  industry: number // wealth generation
  aggression: number // initial bias to violence, 0..1
  leaderNames: string[]
  princessNames: string[]
  epithet: string
}

export interface Leader {
  name: string
  age: number
  trait: LeaderTrait
}

export type LeaderTrait =
  | "воинственный"
  | "мудрый"
  | "алчный"
  | "милосердный"
  | "коварный"
  | "харизматичный"

export interface Marriage {
  a: number
  b: number
  year: number
  text: string
}

export interface Faction {
  id: number
  species: SpeciesDef
  alive: boolean
  population: number
  military: number
  wealth: number
  food: number
  territory: number
  leader: Leader
  // learning
  q: Record<string, number>
  epsilon: number
  updates: number
  lastAction: { action: ActionType; target: number | null } | null
  kills: number
  diedYear: number | null
  conqueredBy: number | null
}

export type EventKind =
  | "war"
  | "battle"
  | "peace"
  | "diplomacy"
  | "trade"
  | "marriage"
  | "betrayal"
  | "death"
  | "succession"
  | "disaster"
  | "conquest"
  | "develop"
  | "raid"
  | "world"

export interface SimEvent {
  id: number
  year: number
  kind: EventKind
  text: string
  actors: number[] // faction ids for color chips
  important: boolean
}

export interface World {
  year: number
  factions: Faction[]
  relations: number[][] // -100..100
  wars: boolean[][]
  alliances: boolean[][]
  tradePacts: boolean[][]
  marriages: Marriage[]
  events: SimEvent[]
  eventId: number
  history: number[][] // per faction: power samples
  historyYears: number[]
  finished: boolean
  winner: number | null
}
