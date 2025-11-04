# Architecture Overview

This document provides a comprehensive overview of the Quantelix AI Game Engine architecture, including system design, component interactions, and architectural patterns.

## Table of Contents
- [High-Level Architecture](#high-level-architecture)
- [Core Design Patterns](#core-design-patterns)
- [System Components](#system-components)
- [Data Flow](#data-flow)
- [Component Interactions](#component-interactions)
- [Performance Architecture](#performance-architecture)
- [Scalability Considerations](#scalability-considerations)
- [Security Architecture](#security-architecture)
- [Related Documentation](#related-documentation)

## High-Level Architecture

The engine follows a **modular, event-driven architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Game Engine                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Input System │  │ World System │  │ Entity System │         │
│  │             │  │             │  │               │         │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤         │
│  │ AI System   │  │ Physics     │  │ Rendering   │         │
│  │             │  │ System      │  │ System      │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                           │                                     │
│                    ┌──────┴──────┐                            │
│                    │ Event Bus   │                            │
│                    │ (Mediator)  │                            │
│                    └──────┬──────┘                            │
│                           │                                     │
│  ┌─────────────┐  ┌──────┴──────┐  ┌─────────────┐         │
│  │ DeepSeek    │  │ Kimi AI     │  │ Game Config │         │
│  │ AI API      │  │ API         │  │ & Types     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                           │
                  ┌────────┴────────┐
                  │  PIXI.js Engine │
                  │  (Rendering)    │
                  └────────┬────────┘
                           │
                  ┌────────┴────────┐
                  │  Matter.js      │
                  │  (Physics)      │
                  └─────────────────┘
```

## Core Design Patterns

### 1. System Pattern
Each major functionality is encapsulated in a `GameSystem`:

```typescript
export interface GameSystem {
  readonly name: string;
  readonly priority: number;
  initialize(): void;
  update(deltaMs: number): void;
  destroy(): void;
}
```

**Benefits:**
- Clear lifecycle management
- Dependency ordering via priorities
- Modular testing and development
- Hot-swappable components

### 2. Event-Driven Architecture
Decoupled communication via EventBus:

```typescript
export class EventBus {
  emit<T>(event: string, data: T): void;
  on<T>(event: string, handler: (data: T) => void): void;
  off(event: string, handler: Function): void;
}
```

**Key Events:**
- `entity:added` - New entity created
- `entity:removed` - Entity destroyed
- `world:state` - World state update
- `npc:behavior` - AI behavior decision
- `player:damage` - Player damage event

### 3. Entity-Component Pattern
Entities are composed of reusable components:

```typescript
export class BaseEntity {
  protected body: Matter.Body;      // Physics component
  protected sprite: Sprite;          // Rendering component
  protected behaviors: Behavior[];   // AI components
  
  update(delta: number): void {
    // Sync physics → rendering
    this.sprite.position.set(this.body.position.x, this.body.position.y);
  }
}
```

### 4. Factory Pattern
System creation and configuration:

```typescript
export class GameEngine {
  constructor(options: GameEngineOptions) {
    this.physics = new PhysicsEngine();
    this.rendering = new RenderingSystem(renderingOptions);
    this.world = new WorldManager(gameConfig, this.eventBus);
    this.entities = new EntityManager(/* dependencies */);
    this.ai = new AIManager(/* AI options */);
  }
}
```

## System Components

### Core Systems

#### 1. GameEngine (Central Coordinator)
```typescript
export class GameEngine {
  private readonly systemManager: SystemManager;
  private readonly eventBus: EventBus;
  
  async initialize(): Promise<void> {
    // Initialize in dependency order
    await this.systemManager.initializeAll();
    
    // Preload world to prevent black areas
    await this.world.preloadMapAndRender();
  }
  
  start(): void {
    // Main game loop
    this.app.ticker.add((ticker) => {
      this.systemManager.updateAll(ticker.deltaMS);
    });
  }
}
```

#### 2. SystemManager (Lifecycle Controller)
```typescript
export class SystemManager {
  private systems: GameSystem[] = [];
  
  register(system: GameSystem): void {
    this.systems.push(system);
    // Sort by priority (lower = earlier)
    this.systems.sort((a, b) => a.priority - b.priority);
  }
  
  async initializeAll(): Promise<void> {
    for (const system of this.systems) {
      await system.initialize();
    }
  }
  
  updateAll(deltaMs: number): void {
    for (const system of this.systems) {
      system.update(deltaMs);
    }
  }
}
```

#### 3. InputManager (Input Abstraction)
```typescript
export class InputManager {
  private keys: Set<string> = new Set();
  private mousePosition: Vector2 = { x: 0, y: 0 };
  
  initialize(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('keydown', this.handleKeyDown);
    canvas.addEventListener('keyup', this.handleKeyUp);
    canvas.addEventListener('mousemove', this.handleMouseMove);
    canvas.addEventListener('click', this.handleClick);
  }
  
  isKeyPressed(key: string): boolean {
    return this.keys.has(key);
  }
  
  getMousePosition(): Vector2 {
    return this.mousePosition;
  }
}
```

### World Systems

#### 4. WorldManager (World State)
```typescript
export class WorldManager {
  private readonly chunkManager: ChunkManager;
  private readonly weatherSystem: WeatherSystem;
  private timeOfDay = 12;
  
  async preloadMapAndRender(renderer: TerrainRenderer): Promise<void> {
    // Preload 50x50 chunks to eliminate black areas
    await this.chunkManager.preloadMap();
    const allChunks = this.chunkManager.getAllChunks();
    renderer.renderChunks(allChunks);
  }
  
  getState(): WorldState {
    return {
      timeOfDay: this.timeOfDay,
      weather: this.weatherSystem.getState(),
      activeChunks: this.chunkManager.getActiveChunks()
    };
  }
}
```

#### 5. ChunkManager (World Generation)
```typescript
export class ChunkManager {
  private readonly chunks: Map<string, WorldChunk> = new Map();
  private readonly noise: PerlinNoise;
  
  async preloadMap(): Promise<void> {
    // Generate 50x50 chunk grid
    for (let x = -25; x < 25; x++) {
      for (let z = -25; z < 25; z++) {
        const biome = this.generateBiome(x, z);
        const chunk = new WorldChunk(x, z, biome);
        this.chunks.set(`${x},${z}`, chunk);
      }
    }
  }
  
  private generateBiome(x: number, z: number): BiomeType {
    const elevation = this.noise.getElevation(x, z);
    const moisture = this.noise.getMoisture(x, z);
    const temperature = this.noise.getTemperature(x, z);
    
    return this.biomeSystem.determineBiome(elevation, moisture, temperature);
  }
}
```

### Entity Systems

#### 6. EntityManager (Entity Lifecycle)
```typescript
export class EntityManager {
  private entities = new Map<string, BaseEntity>();
  
  addEntity(entity: BaseEntity): void {
    // Add to physics world
    this.physics.addBody(entity.getBody());
    
    // Add to rendering stage
    this.rendering.getStage().addChild(entity.getSprite());
    
    // Store in entity map
    this.entities.set(entity.id, entity);
    
    // Emit entity added event
    this.eventBus.emit("entity:added", { entity });
  }
  
  update(delta: number): void {
    for (const entity of this.entities.values()) {
      entity.update(delta);
    }
    
    // Update world focus on player position
    if (this.player) {
      this.world.focusPosition(this.player.getBody().position);
    }
  }
}
```

### AI Systems

#### 7. AIManager (AI Coordination)
```typescript
export class AIManager {
  private readonly deepSeek: DeepSeekController;
  private readonly kimi: KimiController;
  private aiCallBudget: number;
  
  async requestDialogue(npc: NPC, playerMessage: string): Promise<DialogueResponse> {
    const context: DialogueContext = {
      npcName: npc.name,
      playerMessage,
      affection: this.getNPCAffection(npc),
      mood: this.getNPCMood(npc)
    };
    
    if (!this.kimi.isEnabled() || this.aiCallBudget <= 0) {
      return this.generateFallbackDialogue(context);
    }
    
    const response = await this.kimi.generateDialogue(context);
    this.aiCallBudget -= 1;
    return response;
  }
  
  async evaluateBehavior(state: NPCState): Promise<NPCBehaviorDecision> {
    const context: BehaviorContext = {
      npcId: state.npc.id,
      hunger: state.hunger,
      health: state.health,
      fatigue: state.fatigue,
      worldTime: this.world.getState().timeOfDay,
      distanceToPlayer: this.calculateDistanceToPlayer(state.npc),
      weather: this.world.getWeatherState()
    };
    
    return await this.deepSeek.decideBehavior(context);
  }
}
```

## Data Flow

### 1. Game Loop Data Flow
```
Ticker Event → SystemManager.updateAll() → 
├─ InputSystem.update() → Process Input Events
├─ AISystem.update() → Evaluate NPC Behaviors
├─ PhysicsSystem.update() → Update Physics World
├─ EntitySystem.update() → Update Entity States
├─ WorldSystem.update() → Update World State
└─ RenderingSystem.update() → Render Frame
```

### 2. Entity Creation Flow
```
GameEngine.bootstrapWorld() → 
├─ new Player() → Create Player Entity
├─ EntityManager.addEntity() → 
│  ├─ Physics.addBody() → Add to Physics
│  ├─ Rendering.addChild() → Add to Stage
│  └─ EventBus.emit() → Notify Systems
└─ Camera.follow() → Setup Camera Tracking
```

### 3. AI Decision Flow
```
NPC.update() → 
├─ AIManager.evaluateBehavior() → 
│  ├─ Build Context Data
│  ├─ DeepSeek API Call (if enabled)
│  └─ Fallback to BehaviorTree
├─ Execute Behavior Decision
└─ EventBus.emit() → Broadcast Behavior
```

## Component Interactions

### Event-Driven Interactions
```typescript
// Player takes damage
this.eventBus.emit('player:damage', { 
  amount: 10, 
  source: 'enemy',
  position: playerPosition 
});

// Multiple systems can react
this.eventBus.on('player:damage', ({ amount, source }) => {
  // UI System: Update health bar
  this.ui.updateHealthBar(player.health);
  
  // Audio System: Play damage sound
  this.audio.playSound('player_hurt');
  
  // AI System: Alert nearby enemies
  this.alertNearbyEnemies(playerPosition);
});
```

### Direct System Dependencies
```typescript
// Explicit dependencies injected via constructor
export class EntityManager {
  constructor(
    private readonly physics: PhysicsEngine,
    private readonly rendering: RenderingSystem,
    private readonly world: WorldManager,
    private readonly eventBus: EventBus
  ) {}
}
```

### Shared State Management
```typescript
// World state shared across systems
export interface WorldState {
  timeOfDay: number;
  dayCount: number;
  weather: WeatherState;
  activeChunks: WorldChunk[];
}

// Systems access via WorldManager
const worldState = this.worldManager.getState();
```

## Performance Architecture

### 1. Preloading Strategy
- **Map Preloading**: 50x50 chunks loaded at startup
- **Eliminates Loading Stutter**: No runtime chunk generation
- **Memory Trade-off**: Higher memory usage for smoother performance

### 2. Batch Processing
```typescript
// Batch terrain rendering
renderChunks(chunks: WorldChunk[]): void {
  const startTime = performance.now();
  
  let renderedCount = 0;
  for (const chunk of chunks) {
    if (!this.renderedChunks.has(chunk.id)) {
      this.renderChunk(chunk);
      renderedCount++;
    }
  }
  
  const endTime = performance.now();
  console.log(`Batch rendering: ${renderedCount} chunks in ${endTime - startTime}ms`);
}
```

### 3. AI Rate Limiting
```typescript
// Prevent API abuse
private aiCallBudget: number;

async requestDialogue(npc: NPC, message: string): Promise<DialogueResponse> {
  if (this.aiCallBudget <= 0) {
    return this.generateFallbackDialogue();
  }
  
  const response = await this.kimi.generateDialogue(context);
  this.aiCallBudget -= 1;
  return response;
}
```

### 4. Object Pooling (Future Enhancement)
```typescript
// Reuse frequently created objects
class EntityPool<T extends BaseEntity> {
  private available: T[] = [];
  private active: Set<T> = new Set();
  
  acquire(): T {
    const entity = this.available.pop() || this.createNew();
    this.active.add(entity);
    return entity;
  }
  
  release(entity: T): void {
    this.active.delete(entity);
    entity.reset(); // Reset to initial state
    this.available.push(entity);
  }
}
```

## Scalability Considerations

### 1. Horizontal Scaling
- **Stateless Design**: Systems can be replicated across instances
- **Event-Driven**: Natural fit for distributed systems
- **Chunk-Based World**: Easy to distribute world generation

### 2. Vertical Scaling
- **Priority-Based Systems**: Optimize high-frequency systems first
- **Lazy Loading**: Defer non-critical initializations
- **Memory Management**: Explicit cleanup in destroy methods

### 3. Content Scaling
- **Modular Biomes**: Easy to add new biome types
- **Configurable AI**: Behavior trees can be data-driven
- **Plugin Architecture**: Future support for third-party extensions

## Security Architecture

### 1. API Key Management
```typescript
// Environment-based configuration
const aiOptions: AIManagerOptions = {
  deepSeek: {
    apiKey: process.env.VITE_DEEPSEEK_API_KEY,
    baseUrl: process.env.VITE_DEEPSEEK_BASE_URL
  },
  kimi: {
    apiKey: process.env.VITE_KIMI_API_KEY,
    baseUrl: process.env.VITE_KIMI_BASE_URL
  }
};
```

### 2. Input Sanitization
```typescript
private sanitizeInput(input: string): string {
  // Remove potential XSS vectors
  return input.replace(/[<>\"'&]/g, '');
}
```

### 3. Rate Limiting
- **AI API Calls**: Hourly budget enforcement
- **Input Events**: Throttled input processing
- **Network Requests**: Debounced API calls

### 4. Content Validation
```typescript
private validateDialogueContext(context: DialogueContext): boolean {
  return context.npcName.length > 0 && 
         context.playerMessage.length < 1000 &&
         this.isValidEmotion(context.emotion);
}
```

## Related Documentation

- [Complete Development Guide](./development-guide.md) - Comprehensive development guide
- [API Reference](./api-reference.md) - Complete API documentation
- [Performance Optimization](./performance.md) - Optimization strategies and benchmarks
- [Game Mechanics](./game-mechanics.md) - Core gameplay systems
- [AI Behavior System](./ai-behavior.md) - NPC intelligence and decision making
- [World Generation](./world-generation.md) - Procedural generation algorithms

---

*For more information, visit [Quantelix AI](https://quantelixai.com/) and [Nebulix AI](https://nebulix.quantelixai.com)*