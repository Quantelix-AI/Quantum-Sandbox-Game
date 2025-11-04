# 系统架构概述

本文档全面介绍 Quantelix AI 游戏引擎的架构，包括系统设计、组件交互和架构模式。

## 目录
- [高层架构](#高层架构)
- [核心设计模式](#核心设计模式)
- [系统组件](#系统组件)
- [数据流](#数据流)
- [组件交互](#组件交互)
- [性能架构](#性能架构)
- [可扩展性考虑](#可扩展性考虑)
- [安全架构](#安全架构)
- [相关文档](#相关文档)

## 高层架构

引擎采用**模块化、事件驱动架构**，具有清晰的关注点分离：

```
┌─────────────────────────────────────────────────────────────────┐
│                        游戏引擎                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ 输入系统     │  │ 世界系统     │  │ 实体系统     │         │
│  │             │  │             │  │               │         │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤         │
│  │ AI 系统     │  │ 物理系统     │  │ 渲染系统     │         │
│  │             │  │             │  │               │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                           │                                     │
│                    ┌──────┴──────┐                            │
│                    │ 事件总线     │                            │
│                    │ (中介者)     │                            │
│                    └──────┬──────┘                            │
│                           │                                     │
│  ┌─────────────┐  ┌──────┴──────┐  ┌─────────────┐         │
│  │ DeepSeek    │  │ Kimi AI     │  │ 游戏配置     │         │
│  │ AI API      │  │ API         │  │ 和类型       │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                           │
                  ┌────────┴────────┐
                  │  PIXI.js 引擎   │
                  │  (渲染)         │
                  └────────┬────────┘
                           │
                  ┌────────┴────────┐
                  │  Matter.js      │
                  │  (物理)         │
                  └─────────────────┘
```

## 核心设计模式

### 1. 系统模式
每个主要功能都封装在 `GameSystem` 中：

```typescript
export interface GameSystem {
  readonly name: string;
  readonly priority: number;
  initialize(): void;
  update(deltaMs: number): void;
  destroy(): void;
}
```

**优点：**
- 清晰的生命周期管理
- 通过优先级进行依赖排序
- 模块化测试和开发
- 可热插拔组件

### 2. 事件驱动架构
通过 EventBus 进行解耦通信：

```typescript
export class EventBus {
  emit<T>(event: string, data: T): void;
  on<T>(event: string, handler: (data: T) => void): void;
  off(event: string, handler: Function): void;
}
```

**关键事件：**
- `entity:added` - 新实体创建
- `entity:removed` - 实体销毁
- `world:state` - 世界状态更新
- `npc:behavior` - AI 行为决策
- `player:damage` - 玩家伤害事件

### 3. 实体-组件模式
实体由可重用组件组成：

```typescript
export class BaseEntity {
  protected body: Matter.Body;      // 物理组件
  protected sprite: Sprite;          // 渲染组件
  protected behaviors: Behavior[];   // AI 组件
  
  update(delta: number): void {
    // 同步物理 → 渲染
    this.sprite.position.set(this.body.position.x, this.body.position.y);
  }
}
```

### 4. 工厂模式
系统创建和配置：

```typescript
export class GameEngine {
  constructor(options: GameEngineOptions) {
    this.physics = new PhysicsEngine();
    this.rendering = new RenderingSystem(renderingOptions);
    this.world = new WorldManager(gameConfig, this.eventBus);
    this.entities = new EntityManager(/* 依赖项 */);
    this.ai = new AIManager(/* AI 选项 */);
  }
}
```

## 系统组件

### 核心系统

#### 1. GameEngine（中央协调器）
```typescript
export class GameEngine {
  private readonly systemManager: SystemManager;
  private readonly eventBus: EventBus;
  
  async initialize(): Promise<void> {
    // 按依赖顺序初始化
    await this.systemManager.initializeAll();
    
    // 预加载世界以防止黑色区域
    await this.world.preloadMapAndRender();
  }
  
  start(): void {
    // 主游戏循环
    this.app.ticker.add((ticker) => {
      this.systemManager.updateAll(ticker.deltaMS);
    });
  }
}
```

#### 2. SystemManager（生命周期控制器）
```typescript
export class SystemManager {
  private systems: GameSystem[] = [];
  
  register(system: GameSystem): void {
    this.systems.push(system);
    // 按优先级排序（数字越小执行越早）
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

#### 3. InputManager（输入抽象）
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

### 世界系统

#### 4. WorldManager（世界状态）
```typescript
export class WorldManager {
  private readonly chunkManager: ChunkManager;
  private readonly weatherSystem: WeatherSystem;
  private timeOfDay = 12;
  
  async preloadMapAndRender(renderer: TerrainRenderer): Promise<void> {
    // 预加载 50x50 区块以消除黑色区域
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

#### 5. ChunkManager（世界生成）
```typescript
export class ChunkManager {
  private readonly chunks: Map<string, WorldChunk> = new Map();
  private readonly noise: PerlinNoise;
  
  async preloadMap(): Promise<void> {
    // 生成 50x50 区块网格
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

### 实体系统

#### 6. EntityManager（实体生命周期）
```typescript
export class EntityManager {
  private entities = new Map<string, BaseEntity>();
  
  addEntity(entity: BaseEntity): void {
    // 添加到物理世界
    this.physics.addBody(entity.getBody());
    
    // 添加到渲染舞台
    this.rendering.getStage().addChild(entity.getSprite());
    
    // 存储在实体映射中
    this.entities.set(entity.id, entity);
    
    // 发送实体添加事件
    this.eventBus.emit("entity:added", { entity });
  }
  
  update(delta: number): void {
    for (const entity of this.entities.values()) {
      entity.update(delta);
    }
    
    // 根据玩家位置更新世界焦点
    if (this.player) {
      this.world.focusPosition(this.player.getBody().position);
    }
  }
}
```

### AI 系统

#### 7. AIManager（AI 协调）
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

## 数据流

### 1. 游戏循环数据流
```
Ticker 事件 → SystemManager.updateAll() → 
├─ InputSystem.update() → 处理输入事件
├─ AISystem.update() → 评估 NPC 行为
├─ PhysicsSystem.update() → 更新物理世界
├─ EntitySystem.update() → 更新实体状态
├─ WorldSystem.update() → 更新世界状态
└─ RenderingSystem.update() → 渲染帧
```

### 2. 实体创建流
```
GameEngine.bootstrapWorld() → 
├─ new Player() → 创建玩家实体
├─ EntityManager.addEntity() → 
│  ├─ Physics.addBody() → 添加到物理
│  ├─ Rendering.addChild() → 添加到舞台
│  └─ EventBus.emit() → 通知系统
└─ Camera.follow() → 设置相机跟踪
```

### 3. AI 决策流
```
NPC.update() → 
├─ AIManager.evaluateBehavior() → 
│  ├─ 构建上下文数据
│  ├─ DeepSeek API 调用（如果启用）
│  └─ 回退到行为树
├─ 执行行为决策
└─ EventBus.emit() → 广播行为
```

## 组件交互

### 事件驱动交互
```typescript
// 玩家受到伤害
this.eventBus.emit('player:damage', { 
  amount: 10, 
  source: 'enemy',
  position: playerPosition 
});

// 多个系统可以响应
this.eventBus.on('player:damage', ({ amount, source }) => {
  // UI 系统：更新血条
  this.ui.updateHealthBar(player.health);
  
  // 音频系统：播放受伤音效
  this.audio.playSound('player_hurt');
  
  // AI 系统：提醒附近敌人
  this.alertNearbyEnemies(playerPosition);
});
```

### 直接系统依赖
```typescript
// 通过构造函数注入的显式依赖
export class EntityManager {
  constructor(
    private readonly physics: PhysicsEngine,
    private readonly rendering: RenderingSystem,
    private readonly world: WorldManager,
    private readonly eventBus: EventBus
  ) {}
}
```

### 共享状态管理
```typescript
// 跨系统共享的世界状态
export interface WorldState {
  timeOfDay: number;
  dayCount: number;
  weather: WeatherState;
  activeChunks: WorldChunk[];
}

// 系统通过 WorldManager 访问
const worldState = this.worldManager.getState();
```

## 性能架构

### 1. 预加载策略
- **地图预加载**：启动时加载 50x50 区块
- **消除加载卡顿**：无运行时区块生成
- **内存权衡**：更高的内存使用量以获得更流畅的性能

### 2. 批处理
```typescript
// 批量地形渲染
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
  console.log(`批量渲染：在 ${(endTime - startTime).toFixed(2)}ms 内渲染了 ${renderedCount} 个区块`);
}
```

### 3. AI 速率限制
```typescript
// 防止 API 滥用
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

### 4. 对象池（未来增强）
```typescript
// 重用频繁创建的对象
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
    entity.reset(); // 重置为初始状态
    this.available.push(entity);
  }
}
```

## 可扩展性考虑

### 1. 水平扩展
- **无状态设计**：系统可以在实例间复制
- **事件驱动**：自然适合分布式系统
- **基于区块的世界**：易于分发世界生成

### 2. 垂直扩展
- **基于优先级的系统**：首先优化高频系统
- **延迟加载**：推迟非关键初始化
- **内存管理**：在销毁方法中显式清理

### 3. 内容扩展
- **模块化生物群落**：易于添加新的生物群落类型
- **可配置 AI**：行为树可以是数据驱动的
- **插件架构**：未来支持第三方扩展

## 安全架构

### 1. API 密钥管理
```typescript
// 基于环境的配置
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

### 2. 输入清理
```typescript
private sanitizeInput(input: string): string {
  // 移除潜在的 XSS 向量
  return input.replace(/[<>\"'&]/g, '');
}
```

### 3. 速率限制
- **AI API 调用**：执行每小时预算
- **输入事件**：限流输入处理
- **网络请求**：防抖 API 调用

### 4. 内容验证
```typescript
private validateDialogueContext(context: DialogueContext): boolean {
  return context.npcName.length > 0 && 
         context.playerMessage.length < 1000 &&
         this.isValidEmotion(context.emotion);
}
```

## 相关文档

- [完整开发指南](development-guide.md) - 综合开发指南
- [API 参考](api-reference.md) - 完整的 API 文档
- [性能优化](performance.md) - 优化策略和基准测试
- [游戏机制](game-mechanics.md) - 核心游戏系统
- [AI 行为系统](ai-behavior.md) - NPC 智能和决策制定
- [世界生成](world-generation.md) - 程序化生成算法

---

*更多信息，请访问 [Quantelix AI](https://quantelixai.com/) 和 [Nebulix AI](https://nebulix.quantelixai.com)*