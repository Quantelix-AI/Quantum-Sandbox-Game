# API Reference

Complete API documentation for the Quantelix AI Game Engine.

## Table of Contents
- [Core APIs](#core-apis)
- [Entity APIs](#entity-apis)
- [World APIs](#world-apis)
- [AI APIs](#ai-apis)
- [Physics APIs](#physics-apis)
- [Rendering APIs](#rendering-apis)
- [Event APIs](#event-apis)
- [Utility APIs](#utility-apis)
- [Type Definitions](#type-definitions)
- [Error Handling](#error-handling)
- [Related Documentation](#related-documentation)

## Core APIs

### GameEngine

The main entry point for the game engine.

```typescript
class GameEngine {
  constructor(options: GameEngineOptions)
  
  async initialize(): Promise<void>
  start(): void
  stop(): void
  
  getEventBus(): EventBus
  getEntityManager(): EntityManager
  getWorldManager(): WorldManager
  getAIManager(): AIManager
  getUIManager(): UIManager
}
```

**Parameters:**
- `options: GameEngineOptions` - Engine configuration

**Example:**
```typescript
const game = new GameEngine({
  container: document.getElementById('game-container'),
  seed: 12345,
  maxAiCallsPerHour: 100,
  deepSeekApiKey: 'your-api-key',
  kimiApiKey: 'your-api-key'
});

await game.initialize();
game.start();
```

### GameEngineOptions

```typescript
interface GameEngineOptions {
  container: HTMLElement;
  width?: number;
  height?: number;
  seed: number;
  debug?: boolean;
  maxAiCallsPerHour: number;
  deepSeekApiKey?: string;
  deepSeekBaseUrl?: string;
  kimiApiKey?: string;
  kimiBaseUrl?: string;
}
```

### EventBus

Global event system for decoupled communication.

```typescript
class EventBus {
  emit<T>(event: string, data: T): void
  on<T>(event: string, handler: (data: T) => void): void
  off(event: string, handler: Function): void
  once<T>(event: string, handler: (data: T) => void): void
}
```

**Events:**
- `entity:added` - `{ entity: BaseEntity }`
- `entity:removed` - `{ entityId: string }`
- `world:state` - `{ state: WorldState }`
- `npc:behavior` - `{ npc: NPC, decision: NPCBehaviorDecision }`
- `player:damage` - `{ amount: number, source: string }`
- `world:new-day` - `{ day: number }`

**Example:**
```typescript
// Listen for entity creation
game.getEventBus().on('entity:added', ({ entity }) => {
  console.log(`Entity ${entity.id} created`);
});

// Emit custom event
game.getEventBus().emit('custom:event', { data: 'value' });
```

### SystemManager

Manages game system lifecycle and execution order.

```typescript
class SystemManager {
  register(system: GameSystem): void
  async initializeAll(): Promise<void>
  updateAll(deltaMs: number): void
  destroyAll(): void
}
```

### GameSystem

Base interface for all game systems.

```typescript
interface GameSystem {
  readonly name: string;
  readonly priority: number;
  initialize(): void | Promise<void>;
  update(deltaMs: number): void;
  destroy(): void;
}
```

## Entity APIs

### BaseEntity

Base class for all game entities.

```typescript
abstract class BaseEntity {
  readonly id: string;
  readonly type: string;
  protected body: Matter.Body;
  protected sprite: Sprite;
  
  constructor(x: number, y: number, type: string)
  
  abstract createPhysicsBody(): Matter.Body
  abstract createSprite(): Sprite
  
  getBody(): Matter.Body
  getSprite(): Sprite
  getPosition(): Vector2
  setPosition(x: number, y: number): void
  
  update(delta: number): void
  destroy(): void
}
```

**Example:**
```typescript
class MyEntity extends BaseEntity {
  createPhysicsBody(): Matter.Body {
    return Matter.Bodies.rectangle(0, 0, 32, 32);
  }
  
  createSprite(): Sprite {
    const graphics = new Graphics();
    graphics.rect(0, 0, 32, 32);
    graphics.fill(0xff0000);
    return graphics;
  }
}
```

### Player

Player character entity with input handling.

```typescript
class Player extends BaseEntity {
  constructor(x: number, y: number, inputManager: InputManager)
  
  handleInput(): void
  moveUp(): void
  moveDown(): void
  moveLeft(): void
  moveRight(): void
  jump(): void
  interact(): void
}
```

### NPC

Non-player character with AI capabilities.

```typescript
class NPC extends BaseEntity {
  constructor(x: number, y: number, name: string)
  
  setDialogueProvider(provider: DialogueProvider): void
  setBehaviorProvider(provider: BehaviorProvider): void
  
  requestDialogue(playerMessage: string): Promise<DialogueResponse>
  evaluateBehavior(): Promise<NPCBehaviorDecision>
  
  readonly name: string;
  readonly personality: string;
}
```

**Providers:**
```typescript
type DialogueProvider = (npc: NPC) => Promise<DialogueResponse>;
type BehaviorProvider = (npc: NPC) => Promise<NPCBehaviorDecision>;
```

### Enemy

Hostile NPC entity.

```typescript
class Enemy extends NPC {
  constructor(x: number, y: number, name: string)
  
  attack(target: BaseEntity): void
  patrol(): void
  chase(target: BaseEntity): void
}
```

### EntityManager

Manages all game entities.

```typescript
class EntityManager implements GameSystem {
  addEntity(entity: BaseEntity): void
  removeEntity(entityId: string): void
  getPlayer(): Player
  listEntities(): BaseEntity[]
  getNPCs(): NPC[]
  findNearestNPC(maxDistance: number): NPC | null
  spawnDefaultNPCs(): void
}
```

## World APIs

### WorldManager

Manages world state, time, and weather.

```typescript
class WorldManager implements GameSystem {
  async preloadMapAndRender(renderer: TerrainRenderer): Promise<void>
  focusPosition(position: Vector2): void
  getChunkAt(position: Vector2): WorldChunk
  getWeatherState(): WeatherState
  getState(): WorldState
}
```

### WorldState

```typescript
interface WorldState {
  timeOfDay: number;      // 0-24
  dayCount: number;
  weather: WeatherState;
  activeChunks: WorldChunk[];
}
```

### WeatherState

```typescript
interface WeatherState {
  type: WeatherType;
  intensity: number;
  duration: number;
}

type WeatherType = 'clear' | 'rain' | 'snow' | 'storm' | 'fog';
```

### ChunkManager

Manages world chunks and generation.

```typescript
class ChunkManager {
  async preloadMap(): Promise<void>
  getChunk(x: number, z: number): WorldChunk | undefined
  getChunkAt(position: Vector2): WorldChunk
  getAllChunks(): WorldChunk[]
  getActiveChunks(): WorldChunk[]
  isMapPreloaded(): boolean
}
```

### WorldChunk

```typescript
interface WorldChunk {
  id: string;
  gridX: number;
  gridY: number;
  biome: BiomeType;
  elevation: number;
  moisture: number;
  temperature: number;
}
```

### BiomeType

```typescript
type BiomeType = 'forest' | 'desert' | 'tundra' | 'swamp' | 'plains';
```

## AI APIs

### AIManager

Manages AI-powered NPC behaviors and dialogue.

```typescript
class AIManager implements GameSystem {
  async requestDialogue(npc: NPC, playerMessage: string): Promise<DialogueResponse>
  async evaluateBehavior(state: NPCState): Promise<NPCBehaviorDecision>
  getRemainingBudget(): number
}
```

### AIManagerOptions

```typescript
interface AIManagerOptions {
  maxCallsPerHour: number;
  deepSeek: DeepSeekConfig;
  kimi: KimiConfig;
}
```

### DialogueResponse

```typescript
interface DialogueResponse {
  speaker: string;
  text: string;
  emotion: EmotionType;
  context?: Record<string, any>;
}

type EmotionType = 'happy' | 'sad' | 'angry' | 'neutral' | 'excited' | 'fearful';
```

### NPCBehaviorDecision

```typescript
interface NPCBehaviorDecision {
  action: BehaviorAction;
  target?: Vector2;
  duration: number;
  priority: number;
  reason?: string;
}

type BehaviorAction = 'idle' | 'move' | 'attack' | 'flee' | 'patrol' | 'interact';
```

### BehaviorContext

```typescript
interface BehaviorContext {
  npcId: string;
  hunger: number;
  health: number;
  fatigue: number;
  worldTime: number;
  distanceToPlayer: number;
  weather: WeatherState;
}
```

### DialogueContext

```typescript
interface DialogueContext {
  npcName: string;
  profession: string;
  personality: string;
  backstory: string;
  playerMessage: string;
  affection: number;
  mood: string;
}
```

### DeepSeekController

```typescript
class DeepSeekController {
  constructor(config: DeepSeekConfig)
  
  isEnabled(): boolean
  async decideBehavior(context: BehaviorContext, fallback: () => NPCBehaviorDecision): Promise<NPCBehaviorDecision>
}
```

### KimiController

```typescript
class KimiController {
  constructor(config: KimiConfig)
  
  isEnabled(): boolean
  async generateDialogue(context: DialogueContext): Promise<DialogueResponse>
}
```

## Physics APIs

### PhysicsEngine

Wraps Matter.js physics simulation.

```typescript
class PhysicsEngine {
  readonly engine: Matter.Engine;
  
  addBody(body: Matter.Body): void
  removeBody(body: Matter.Body): void
  update(deltaMs: number): void
  getGravity(): Vector2
  setGravity(x: number, y: number): void
}
```

### CollisionManager

Manages collision detection and responses.

```typescript
class CollisionManager {
  constructor(engine: Matter.Engine, eventBus: EventBus)
  
  initialize(): void
  destroy(): void
  
  onCollisionStart(handler: (event: CollisionEvent) => void): void
  onCollisionEnd(handler: (event: CollisionEvent) => void): void
}
```

### CollisionEvent

```typescript
interface CollisionEvent {
  bodyA: Matter.Body;
  bodyB: Matter.Body;
  entityA?: BaseEntity;
  entityB?: BaseEntity;
  collision: Matter.Collision;
}
```

## Rendering APIs

### RenderingSystem

Manages PixiJS rendering pipeline.

```typescript
class RenderingSystem implements GameSystem {
  constructor(options: RenderingOptions)
  
  getApplication(): PIXI.Application
  getStage(): PIXI.Container
  getCamera(): Camera
  getTerrainRenderer(): TerrainRenderer
  
  screenToWorld(screenX: number, screenY: number): Vector2
  worldToScreen(worldX: number, worldY: number): Vector2
}
```

### RenderingOptions

```typescript
interface RenderingOptions {
  container: HTMLElement;
  width: number;
  height: number;
  background?: number;
  antialias?: boolean;
}
```

### Camera

2D camera for viewport management.

```typescript
class Camera {
  follow(target: DisplayObject): void
  unfollow(): void
  
  setPosition(x: number, y: number): void
  getPosition(): Vector2
  
  zoom(factor: number): void
  getZoom(): number
  
  shake(intensity: number, duration: number): void
}
```

### TerrainRenderer

Renders procedural terrain.

```typescript
class TerrainRenderer {
  constructor(stage: Container)
  
  renderChunk(chunk: WorldChunk, chunkSize?: number): void
  renderChunks(chunks: WorldChunk[], chunkSize?: number): void
  removeChunk(chunkId: string): void
  
  clear(): void
  destroy(): void
}
```

## Event APIs

### InputManager

Handles keyboard and mouse input.

```typescript
class InputManager {
  initialize(canvas: HTMLCanvasElement): void
  destroy(): void
  
  isKeyPressed(key: string): boolean
  isKeyJustPressed(key: string): boolean
  getMousePosition(): Vector2
  
  onKeyDown(key: string, handler: () => void): void
  onKeyUp(key: string, handler: () => void): void
  onMouseMove(handler: (position: Vector2) => void): void
  onClick(handler: (position: Vector2) => void): void
}
```

### UIManager

Manages user interface elements.

```typescript
class UIManager {
  constructor(aiManager: AIManager, eventBus: EventBus)
  
  showDialogue(npc: NPC, message: string): Promise<void>
  hideDialogue(): void
  
  showNotification(message: string, type?: NotificationType): void
  hideNotification(): void
  
  updateInputDisplay(inputs: InputState): void
}
```

## Utility APIs

### PerlinNoise

Generates Perlin noise for terrain generation.

```typescript
class PerlinNoise {
  constructor(seed: number)
  
  getElevation(x: number, z: number): number
  getMoisture(x: number, z: number): number
  getTemperature(x: number, z: number): number
  
  getBiome(x: number, z: number): BiomeType
}
```

### MathUtils

Mathematical utility functions.

```typescript
class MathUtils {
  static clamp(value: number, min: number, max: number): number
  static lerp(start: number, end: number, factor: number): number
  static distance(a: Vector2, b: Vector2): number
  static angle(a: Vector2, b: Vector2): number
  static randomRange(min: number, max: number): number
}
```

## Type Definitions

### Vector2

```typescript
interface Vector2 {
  x: number;
  y: number;
}
```

### GameConfig

```typescript
interface GameConfig {
  worldSizeKm: number;
  chunkSizeMeters: number;
  seed: number;
  maxAiCallsPerHour: number;
  enableDebug: boolean;
}
```

### NPCState

```typescript
interface NPCState {
  npc: NPC;
  decisionCooldown: number;
  hunger: number;
  health: number;
  fatigue: number;
}
```

### DeepSeekConfig

```typescript
interface DeepSeekConfig {
  apiKey?: string;
  baseUrl?: string;
}
```

### KimiConfig

```typescript
interface KimiConfig {
  apiKey?: string;
  baseUrl?: string;
}
```

## Error Handling

### Error Types

```typescript
class GameEngineError extends Error {
  constructor(message: string, public code: string)
}

class AIError extends GameEngineError {
  constructor(message: string, public aiProvider: string)
}

class PhysicsError extends GameEngineError {
  constructor(message: string, public body?: Matter.Body)
}

class RenderError extends GameEngineError {
  constructor(message: string, public sprite?: DisplayObject)
}
```

### Error Handling Patterns

```typescript
try {
  await game.initialize();
} catch (error) {
  if (error instanceof AIError) {
    console.error(`AI Error from ${error.aiProvider}: ${error.message}`);
    // Fallback to default behavior
  } else if (error instanceof PhysicsError) {
    console.error(`Physics Error: ${error.message}`);
    // Check body validity
  } else {
    console.error(`Game Error: ${error.message}`);
  }
}
```

### Graceful Degradation

```typescript
// AI fallback when API unavailable
async requestDialogue(npc: NPC, message: string): Promise<DialogueResponse> {
  try {
    if (!this.kimi.isEnabled() || this.aiCallBudget <= 0) {
      throw new AIError('AI service unavailable', 'kimi');
    }
    
    return await this.kimi.generateDialogue(context);
  } catch (error) {
    // Fallback to predefined responses
    return this.generateFallbackDialogue(context);
  }
}
```

## Related Documentation

- [Complete Development Guide](./development-guide.md) - Comprehensive development guide
- [Architecture Overview](./architecture.md) - System design and component interaction
- [Performance Optimization](./performance.md) - Optimization strategies and benchmarks
- [Game Mechanics](./game-mechanics.md) - Core gameplay systems
- [AI Behavior System](./ai-behavior.md) - NPC intelligence and decision making
- [World Generation](./world-generation.md) - Procedural generation algorithms

---

*For more information, visit [Quantelix AI](https://quantelixai.com/) and [Nebulix AI](https://nebulix.quantelixai.com)*