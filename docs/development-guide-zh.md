# 完整开发指南

使用 Quantelix AI 游戏引擎开发的综合指南。

## 目录
- [概述](#概述)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [核心系统](#核心系统)
- [开发工作流](#开发工作流)
- [测试](#测试)
- [部署](#部署)
- [最佳实践](#最佳实践)
- [相关文档](#相关文档)

## 概述

Quantelix AI 游戏引擎是一个基于 TypeScript 和 PixiJS 的 2D 游戏引擎，具有 AI 驱动的 NPC、程序化世界生成和模块化架构。本指南涵盖了使用此引擎开发游戏所需了解的所有内容。

🔗 **相关链接：**
- [Quantelix AI](https://quantelixai.com/) - AI 平台
- [Nebulix AI](https://nebulix.quantelixai.com) - 高级 AI 解决方案

## 项目结构

```
src/
├── ai/                    # AI 系统和控制器
│   ├── AIManager.ts      # 主要的 AI 管理系统
│   ├── BehaviorTree.ts   # NPC 行为决策树
│   ├── DeepSeekController.ts # DeepSeek AI 集成
│   └── KimiController.ts # Kimi AI 集成
├── core/                  # 核心引擎系统
│   ├── GameEngine.ts     # 主游戏引擎类
│   ├── EventBus.ts       # 解耦通信的事件系统
│   ├── InputManager.ts   # 输入处理（鼠标、键盘）
│   └── SystemManager.ts  # 系统生命周期管理
├── entities/              # 游戏实体
│   ├── BaseEntity.ts     # 基础实体类
│   ├── Player.ts         # 玩家角色
│   ├── NPC.ts           # 非玩家角色
│   └── EntityManager.ts  # 实体生命周期管理
├── physics/               # 物理模拟
│   ├── PhysicsEngine.ts  # Matter.js 物理集成
│   └── CollisionManager.ts # 碰撞检测和处理
├── rendering/             # 图形和渲染
│   ├── RenderingSystem.ts # 主渲染管线
│   ├── TerrainRenderer.ts  # 程序化地形渲染
│   └── Camera.ts          # 2D 相机系统
├── world/                 # 世界生成和管理
│   ├── WorldManager.ts   # 世界状态和时间管理
│   ├── ChunkManager.ts   # 基于区块的世界加载
│   ├── BiomeSystem.ts    # 生物群落生成和管理
│   └── WeatherSystem.ts  # 动态天气模拟
├── ui/                    # 用户界面
│   └── UIManager.ts      # UI 系统管理
└── utils/                 # 工具函数
    ├── Noise.ts          # Perlin 噪声生成
    └── MathUtils.ts      # 数学工具
```

## 快速开始

### 前置要求

- Node.js 18+
- npm 或 pnpm
- 支持 WebGL 的现代网络浏览器

### 安装

```bash
# 克隆仓库
git clone <repository-url>
cd quantelix-ai-game

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 基本游戏设置

```typescript
import { GameEngine } from '@/core/GameEngine';

// 创建游戏引擎实例
const game = new GameEngine({
  container: document.getElementById('game-container'),
  seed: 12345, // 世界生成种子
  maxAiCallsPerHour: 100,
  deepSeekApiKey: 'your-deepseek-key',
  kimiApiKey: 'your-kimi-key'
});

// 初始化并启动游戏
await game.initialize();
game.start();
```

## 核心系统

### 游戏引擎

`GameEngine` 类是管理所有游戏系统的中央协调器：

```typescript
export class GameEngine {
  private readonly systemManager: SystemManager;
  private readonly inputManager: InputManager;
  private readonly physics: PhysicsEngine;
  private readonly world: WorldManager;
  private readonly entities: EntityManager;
  private readonly ai: AIManager;
  
  constructor(options: GameEngineOptions) {
    // 初始化所有系统
  }
  
  async initialize(): Promise<void> {
    // 按依赖顺序初始化所有系统
    await this.systemManager.initializeAll();
    
    // 预加载地图以防止黑色区域
    await this.world.preloadMapAndRender(this.rendering.getTerrainRenderer());
  }
}
```

### 实体系统

实体是具有物理、渲染和行为的游戏对象：

```typescript
export class BaseEntity {
  protected body: Matter.Body;
  protected sprite: Sprite;
  
  constructor(x: number, y: number, type: string) {
    this.body = this.createPhysicsBody(x, y);
    this.sprite = this.createSprite();
  }
  
  update(delta: number): void {
    // 将物理体位置同步到精灵位置
    this.sprite.position.set(this.body.position.x, this.body.position.y);
  }
}
```

### AI 系统

AI 驱动的 NPC 使用行为树和 AI API：

```typescript
export class AIManager {
  private readonly behaviorTree: BehaviorTree;
  private readonly deepSeek: DeepSeekController;
  private readonly kimi: KimiController;
  
  async requestDialogue(npc: NPC, playerMessage: string): Promise<DialogueResponse> {
    const context: DialogueContext = {
      npcName: npc.name,
      playerMessage,
      // ... 其他上下文
    };
    
    return await this.kimi.generateDialogue(context);
  }
  
  async evaluateBehavior(state: NPCState): Promise<NPCBehaviorDecision> {
    const context: BehaviorContext = {
      npcId: state.npc.id,
      hunger: state.hunger,
      health: state.health,
      // ... 其他上下文
    };
    
    return await this.deepSeek.decideBehavior(context);
  }
}
```

### 世界生成

使用 Perlin 噪声的程序化世界生成：

```typescript
export class ChunkManager {
  private readonly noise: PerlinNoise;
  
  async preloadMap(): Promise<void> {
    // 预加载 50x50 区块以防止黑色区域
    const chunks: WorldChunk[] = [];
    
    for (let x = -25; x < 25; x++) {
      for (let z = -25; z < 25; z++) {
        const biome = this.generateBiome(x, z);
        const chunk = new WorldChunk(x, z, biome);
        chunks.push(chunk);
      }
    }
    
    // 存储区块以供后续渲染
    this.chunks.set(chunks);
  }
  
  private generateBiome(x: number, z: number): BiomeType {
    const elevation = this.noise.getElevation(x, z);
    const moisture = this.noise.getMoisture(x, z);
    const temperature = this.noise.getTemperature(x, z);
    
    // 根据气候参数确定生物群落
    return this.biomeSystem.determineBiome(elevation, moisture, temperature);
  }
}
```

## 开发工作流

### 1. 创建新实体

```typescript
export class MyEntity extends BaseEntity {
  constructor(x: number, y: number) {
    super(x, y, 'my-entity');
  }
  
  createPhysicsBody(): Matter.Body {
    return Matter.Bodies.rectangle(this.x, this.y, 32, 32, {
      frictionAir: 0.01,
      restitution: 0.8
    });
  }
  
  createSprite(): Sprite {
    const graphics = new Graphics();
    graphics.rect(0, 0, 32, 32);
    graphics.fill(0xff0000);
    return graphics;
  }
  
  update(delta: number): void {
    super.update(delta);
    // 自定义更新逻辑
  }
}
```

### 2. 添加新系统

```typescript
export class MySystem implements GameSystem {
  public readonly name = 'my-system';
  public readonly priority = 60; // 数字越小执行越早
  
  constructor(private readonly dependencies: Dependencies) {}
  
  initialize(): void {
    // 系统初始化
  }
  
  update(delta: number): void {
    // 每帧更新
  }
  
  destroy(): void {
    // 清理资源
  }
}
```

### 3. 事件系统

使用事件总线进行解耦通信：

```typescript
// 发送事件
this.eventBus.emit('player:damage', { amount: 10, source: 'enemy' });

// 监听事件
this.eventBus.on('player:damage', ({ amount, source }) => {
  console.log(`玩家受到 ${amount} 点来自 ${source} 的伤害`);
});
```

### 4. 输入处理

```typescript
// 键盘输入
this.inputManager.on('keydown', (event) => {
  switch (event.code) {
    case 'KeyW':
      this.player.moveUp();
      break;
    case 'Space':
      this.player.jump();
      break;
  }
});

// 鼠标输入
this.inputManager.on('click', (event) => {
  const worldPos = this.rendering.screenToWorld(event.x, event.y);
  this.player.moveTo(worldPos);
});
```

## 测试

### 单元测试

```typescript
import { describe, it, expect } from 'vitest';
import { MyEntity } from '@/entities/MyEntity';

describe('MyEntity', () => {
  it('应该使用正确的属性初始化', () => {
    const entity = new MyEntity(100, 200);
    
    expect(entity.x).toBe(100);
    expect(entity.y).toBe(200);
    expect(entity.type).toBe('my-entity');
  });
  
  it('应该正确更新位置', () => {
    const entity = new MyEntity(0, 0);
    const initialPos = entity.getPosition();
    
    entity.update(16); // 16ms 帧
    
    expect(entity.getPosition()).not.toEqual(initialPos);
  });
});
```

### 集成测试

```typescript
import { GameEngine } from '@/core/GameEngine';

describe('游戏集成', () => {
  it('应该初始化所有系统', async () => {
    const game = new GameEngine({
      container: document.createElement('div'),
      seed: 12345,
      maxAiCallsPerHour: 10
    });
    
    await game.initialize();
    
    expect(game.getEntityManager()).toBeDefined();
    expect(game.getWorldManager()).toBeDefined();
    expect(game.getAIManager()).toBeDefined();
  });
});
```

## 部署

### 构建配置

```bash
# 生产构建
npm run build

# 预览生产构建
npm run preview
```

### 环境变量

```env
VITE_DEEPSEEK_API_KEY=your-deepseek-key
VITE_DEEPSEEK_BASE_URL=https://api.deepseek.com
VITE_KIMI_API_KEY=your-kimi-key
VITE_KIMI_BASE_URL=https://api.kimi.com
```

### 性能优化

- 在 Web 服务器上启用 gzip 压缩
- 对静态资源使用 CDN
- 实现 Service Worker 以获得离线功能
- 优化精灵图集和纹理打包

## 最佳实践

### 1. 实体设计
- 保持实体专注于单一职责
- 对复杂行为使用组合而非继承
- 始终在实体销毁方法中清理资源

### 2. 性能
- 对频繁创建/销毁的实体使用对象池
- 为远距离对象实现细节层次（LOD）
- 批量处理相似的渲染操作
- 定期使用浏览器开发工具进行分析

### 3. AI 集成
- 缓存 AI 响应以减少 API 调用
- 当 AI 服务不可用时实现回退行为
- 监控 AI 调用预算并实现速率限制
- 记录 AI 交互以进行调试和改进

### 4. 世界生成
- 使用确定性生成以获得可重现的世界
- 对大世界实现基于区块的加载
- 尽可能将生成的区块缓存到磁盘
- 使用多个噪声倍频程以获得真实的地形

### 5. 错误处理
- 为缺失的 AI 服务实现优雅降级
- 添加全面的错误日志记录和监控
- 使用 TypeScript 严格模式以获得更好的类型安全
- 实现用户友好的错误消息

## 相关文档

- [系统架构](architecture.md) - 系统设计和组件交互
- [API 参考](api-reference.md) - 完整的 API 文档
- [性能优化](performance.md) - 优化策略和基准测试
- [游戏机制](game-mechanics.md) - 核心游戏系统
- [AI 行为系统](ai-behavior.md) - NPC 智能和决策制定
- [世界生成](world-generation.md) - 程序化生成算法

---

*更多信息，请访问 [Quantelix AI](https://quantelixai.com/) 和 [Nebulix AI](https://nebulix.quantelixai.com)*