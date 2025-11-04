# API 参考文档

Quantelix AI 游戏引擎的完整 API 文档。

## 目录
- [核心 API](#核心-api)
- [实体 API](#实体-api)
- [世界 API](#世界-api)
- [AI API](#ai-api)
- [物理 API](#物理-api)
- [渲染 API](#渲染-api)
- [事件 API](#事件-api)
- [工具 API](#工具-api)
- [类型定义](#类型定义)
- [错误处理](#错误处理)
- [相关文档](#相关文档)

## 核心 API

### GameEngine

游戏引擎的主入口点。

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

**参数:**
- `options: GameEngineOptions` - 引擎配置

**示例:**
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

用于解耦通信的全局事件系统。

```typescript
class EventBus {
  emit<T>(event: string, data: T): void
  on<T>(event: string, handler: (data: T) => void): void
  off(event: string, handler: Function): void
  once<T>(event: string, handler: (data: T) => void): void
}
```

**事件:**
- `entity:added` - `{ entity: BaseEntity }`
- `entity:removed` - `{ entityId: string }`
- `world:state` - `{ state: WorldState }`
- `npc:behavior` - `{ npc: NPC, decision: NPCBehaviorDecision }`
- `player:damage` - `{ amount: number, source: string }`
- `world:new-day` - `{ day: number }`

**示例:**
```typescript
// 监听实体创建
game.getEventBus().on('entity:added', ({ entity }) => {
  console.log(`实体 ${entity.id} 已创建`);
});

// 触发自定义事件
game.getEventBus().emit('custom:event', { data: 'value' });
```

### SystemManager

管理游戏系统生命周期和执行顺序。

```typescript
class SystemManager {
  register(system: GameSystem): void
  async initializeAll(): Promise<void>
  updateAll(deltaMs: number): void
  destroyAll(): void
}
```

### GameSystem

所有游戏系统的基础接口。

```typescript
interface GameSystem {
  readonly name: string;
  readonly priority: number;
  initialize(): void | Promise<void>;
  update(deltaMs: number): void;
  destroy(): void;
}
```

## 实体 API

### BaseEntity

所有游戏实体的基类。

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

**示例:**
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

带有输入处理的玩家角色实体。

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

具有 AI 能力的非玩家角色。

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

**提供者:**
```typescript
type DialogueProvider = (npc: NPC) => Promise<DialogueResponse>;
type BehaviorProvider = (npc: NPC) => Promise<NPCBehaviorDecision>;
```

### Enemy

敌对 NPC 实体。

```typescript
class Enemy extends NPC {
  constructor(x: number, y: number, name: string)
  
  attack(target: BaseEntity): void
  patrol(): void
  chase(target: BaseEntity): void
}
```

### EntityManager

管理所有游戏实体。

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

## 世界 API

### WorldManager

管理世界状态、时间和天气。

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

管理世界区块和生成。

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

## AI API

### AIManager

管理 AI 驱动的 NPC 行为和对话。

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

## 物理 API

### PhysicsEngine

封装 Matter.js 物理模拟。

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

管理碰撞检测和响应。

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

## 渲染 API

### RenderingSystem

管理 PixiJS 渲染管线。

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

用于视口管理的 2D 相机。

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

渲染程序化地形。

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

## 事件 API

### InputManager

处理键盘和鼠标输入。

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

管理用户界面元素。

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

## 工具 API

### PerlinNoise

生成 Perlin 噪声用于地形生成。

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

数学工具函数。

```typescript
class MathUtils {
  static clamp(value: number, min: number, max: number): number
  static lerp(start: number, end: number, factor: number): number
  static distance(a: Vector2, b: Vector2): number
  static angle(a: Vector2, b: Vector2): number
  static randomRange(min: number, max: number): number
}
```

## 类型定义

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

## 错误处理

### 错误类型

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

### 错误处理模式

```typescript
try {
  await game.initialize();
} catch (error) {
  if (error instanceof AIError) {
    console.error(`AI 错误来自 ${error.aiProvider}: ${error.message}`);
    // 回退到默认行为
  } else if (error instanceof PhysicsError) {
    console.error(`物理错误: ${error.message}`);
    // 检查物体有效性
  } else {
    console.error(`游戏错误: ${error.message}`);
  }
}
```

### 优雅降级

```typescript
// AI 不可用时回退
async requestDialogue(npc: NPC, message: string): Promise<DialogueResponse> {
  try {
    if (!this.kimi.isEnabled() || this.aiCallBudget <= 0) {
      throw new AIError('AI 服务不可用', 'kimi');
    }
    
    return await this.kimi.generateDialogue(context);
  } catch (error) {
    // 回退到预定义响应
    return this.generateFallbackDialogue(context);
  }
}
```

## 相关文档

- [完整开发指南](development-guide-zh.md) - 综合开发指南
- [系统架构概述](architecture-zh.md) - 系统设计和组件交互
- [性能优化](performance-zh.md) - 优化策略和基准测试
- [游戏机制](game-mechanics-zh.md) - 核心游戏系统
- [AI 行为系统](ai-behavior-zh.md) - NPC 智能和决策制定
- [世界生成](world-generation-zh.md) - 程序化生成算法

---

*更多信息请访问 [Quantelix AI](https://quantelixai.com/) 和 [Nebulix AI](https://nebulix.quantelixai.com)*