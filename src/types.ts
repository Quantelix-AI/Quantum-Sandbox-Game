export interface Vector2 {
  x: number;
  y: number;
}

export type EntityType = "player" | "npc" | "enemy" | "object";

export interface GameConfig {
  worldSizeKm: number;
  chunkSizeMeters: number;
  seed: number;
  maxAiCallsPerHour: number;
  enableDebug: boolean;
}

export type BiomeType = "forest" | "desert" | "tundra" | "swamp" | "plains";
export type WeatherType = "clear" | "rain" | "storm" | "fog" | "snow";

export interface WorldChunk {
  id: string;
  gridX: number;
  gridY: number;
  biome: BiomeType;
  entities: Set<string>;
  generatedAt: number;
}

export interface NPCBehaviorDecision {
  action: "MOVE" | "INTERACT" | "IDLE" | "WORK" | "SLEEP" | "EAT" | "ATTACK" | "FLEE";
  target: string;
  priority: number;
  duration: number;
  reasoning: string;
}

export interface DialogueResponse {
  speaker: string;
  text: string;
  emotion?: string;
}

export interface QuestDefinition {
  title: string;
  description: string;
  objectives: string[];
  rewards: {
    exp: number;
    gold: number;
    items?: string[];
  };
  timeLimit?: number;
}
