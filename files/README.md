# 🎮 2D沙盒生存游戏 - AI驱动的开放世界

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![PixiJS](https://img.shields.io/badge/PixiJS-8.0-green)](https://pixijs.com/)
[![Matter.js](https://img.shields.io/badge/Matter.js-latest-orange)](https://brm.io/matter-js/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
<div align="center">
  <p><b>Built with ❤️ and powered by AI</b></p>
  <p>
    <a href="https://quantelixai.com/">
      <img src="https://img.shields.io/badge/Powered%20by-Quantelix%20AI-purple.svg" alt="Powered by Quantelix AI">
    </a>
    <a href="https://nebulix.quantelix.com">
      <img src="https://img.shields.io/badge/Enhanced%20by-Nebulix%20AI-blue.svg" alt="Enhanced by Nebulix AI">
    </a>
  </p>
</div>

一个基于Web技术的2D沙盒生存游戏，采用AI驱动的NPC系统，提供独特的沉浸式游戏体验。

## ✨ 核心特性

- 🌍 **超大世界**: 1100万平方公里程序化生成的开放世界
- 🤖 **AI驱动**: DeepSeek + Kimi API驱动的智能NPC系统
- ⚡ **高性能**: 60fps流畅渲染，支持数千实体同屏
- 🎨 **流体视觉**: 黑白灰基调 + 自然配色的独特美术风格
- 🔧 **真实物理**: Matter.js物理引擎带来真实的交互体验
- 🌦️ **动态天气**: AI控制的天气系统和昼夜循环
- 🎯 **动态任务**: AI生成的无限任务和剧情内容

## 🎯 项目愿景

创造一个"永远不会玩腻"的沙盒游戏 - 通过AI技术让每个NPC都有独特的性格、记忆和行为模式，使每次游戏都成为独一无二的体验。

## 📋 技术栈

| 技术 | 用途 | 版本 |
|------|------|------|
| TypeScript | 开发语言 | 5.0+ |
| PixiJS | 2D渲染引擎 | 8.0+ |
| Matter.js | 2D物理引擎 | 0.19+ |
| Vite | 构建工具 | 5.0+ |
| Tauri | 桌面应用打包 | 1.5+ |
| DeepSeek API | NPC行为AI | - |
| Kimi API | 对话生成AI | - |

## 🚀 快速开始

### 前置要求

- Node.js 18+
- npm 或 yarn
- Git

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/Quantelix-AI/Quantum-Sandbox-Game.git
cd game-project

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入你的AI API密钥

# 启动开发服务器
npm run dev
```

访问 `http://localhost:3000` 即可开始游戏！

### 环境变量配置

在 `.env` 文件中配置以下变量：

```env
# DeepSeek API
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com

# Kimi API
KIMI_API_KEY=your_kimi_api_key
KIMI_BASE_URL=https://api.moonshot.cn

# 游戏配置
GAME_WORLD_SEED=12345
MAX_AI_CALLS_PER_HOUR=1000
ENABLE_DEBUG_MODE=true
```

## 📁 项目结构

```
项目根目录/
├── src/
│   ├── ai/                    # AI系统与集成
│   │   ├── AIManager.ts       # AI管理中心
│   │   ├── BehaviorTree.ts    # NPC行为树
│   │   ├── DeepSeekController.ts  # DeepSeek集成
│   │   └── KimiController.ts      # Kimi集成
│   ├── core/                  # 核心引擎
│   │   ├── GameEngine.ts      # 主游戏引擎
│   │   ├── InputManager.ts    # 输入系统
│   │   ├── SystemManager.ts   # 系统生命周期管理
│   │   └── EventBus.ts        # 事件系统
│   ├── entities/              # 实体系统
│   │   ├── Player.ts          # 玩家
│   │   ├── NPC.ts             # 非玩家角色
│   │   ├── Enemy.ts           # 敌人实体
│   │   └── EntityManager.ts   # 实体管理
│   ├── physics/               # 物理系统
│   │   ├── PhysicsEngine.ts   # Matter.js 集成
│   │   └── CollisionManager.ts # 碰撞检测
│   ├── rendering/             # 渲染系统
│   │   ├── RenderingSystem.ts # 渲染管线
│   │   ├── CameraSystem.ts    # 摄像机控制
│   │   ├── ParticleSystem.ts  # 粒子效果
│   │   └── TerrainRenderer.ts # 地形渲染
│   ├── world/                 # 世界系统
│   │   ├── WorldManager.ts    # 世界状态管理
│   │   ├── ChunkManager.ts    # 地形分块
│   │   ├── BiomeSystem.ts     # 生物群系生成
│   │   └── WeatherSystem.ts   # 动态天气
│   ├── ui/                    # UI系统
│   │   ├── UIManager.ts       # UI管理
│   │   ├── DialogSystem.ts    # 对话界面
│   │   └── Inventory.ts       # 背包系统
│   └── utils/                 # 工具类
│       ├── MathUtils.ts       # 数学工具
│       ├── ObjectPool.ts      # 对象池
│       └── PerlinNoise.ts     # 噪声生成
├── assets/                    # 游戏资源
│   ├── sprites/              # 贴图与纹理
│   ├── sounds/               # 音频文件
│   └── data/                 # 配置数据
├── docs/                     # 文档
└── tests/                    # 测试文件
```

## 🎮 开发指南

### 1. 创建新的实体

```typescript
import { GameEntity } from './entities/GameEntity';

class MyEntity extends GameEntity {
  constructor() {
    super();
    // 初始化实体
  }
  
  update(deltaTime: number): void {
    // 更新逻辑
  }
  
  render(): void {
    // 渲染逻辑
  }
}
```

### 2. 添加新的AI行为

```typescript
import { AIController } from './ai/AIController';

class CustomAI extends AIController {
  async decideBehavior(npc: NPC): Promise<Action> {
    const prompt = this.buildPrompt(npc);
    const response = await this.callAI(prompt);
    return this.parseAction(response);
  }
}
```

### 3. 实现新的系统

```typescript
import { GameSystem } from './core/GameSystem';

class MySystem implements GameSystem {
  update(deltaTime: number): void {
    // 系统更新逻辑
  }
  
  initialize(): void {
    // 初始化逻辑
  }
}
```

## 🧪 测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- EntityManager

# 生成覆盖率报告
npm run test:coverage
```

## 📦 构建与部署

```bash
# 开发构建
npm run build:dev

# 生产构建
npm run build

# 构建桌面应用
npm run build:desktop

# 预览构建结果
npm run preview
```

## 🎯 开发路线图

### Phase 1: MVP (1-3个月) ✅
- [x] 核心引擎搭建
- [x] 基础渲染系统
- [x] 物理系统集成
- [x] 简单世界生成
- [ ] 玩家控制系统
- [ ] 基础NPC系统

### Phase 2: Alpha (4-6个月) 🚧
- [ ] AI系统完整集成
- [ ] 扩展世界规模到500x500km
- [ ] 5大生物群系实现
- [ ] 战斗系统
- [ ] UI系统
- [ ] 存档系统

### Phase 3: Beta (7-9个月) 📅
- [ ] 完整1100万平方公里世界
- [ ] 高级AI特性（记忆、情感）
- [ ] 动态天气与环境
- [ ] 性能优化
- [ ] 多平台适配
- [ ] Early Access发布

## 🤝 贡献指南

我们欢迎各种形式的贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详情。

### 开发流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 配置
- 编写单元测试
- 添加 JSDoc 注释
- 保持代码覆盖率 > 80%

## 📖 文档

### 🚀 快速开始
- [快速入门教程](files/快速入门教程.md) - 30分钟快速上手
- [AI提示词库-快速参考](files/AI提示词库-快速参考.md) - AI系统提示词与用法

### 🔗 完整技术文档（中文）
- **[技术文档索引](docs/index.md)** - 文档总览与导航
- **[开发指南](docs/development-guide-zh.md)** - 完整开发流程与最佳实践
- **[架构概述](docs/architecture-zh.md)** - 系统设计与模块分层
- **[API参考](docs/api-reference-zh.md)** - 接口说明与使用示例
- **[性能优化](docs/performance-zh.md)** - 优化策略与性能基准
- **[游戏机制](docs/game-mechanics-zh.md)** - 核心玩法与机制设计
- **[AI行为系统](docs/ai-behavior-zh.md)** - NPC智能与决策模型
- **[世界生成](docs/world-generation-zh.md)** - 程序化世界生成算法

### 📚 English Documentation
- [Development Guide](docs/development-guide.md)
- [Architecture](docs/architecture.md)
- [API Reference](docs/api-reference.md)
- [Performance](docs/performance.md)
- [Game Mechanics](docs/game-mechanics.md)
- [AI Behavior](docs/ai-behavior.md)
- [World Generation](docs/world-generation.md)
- [Quick Start Tutorial](docs/quick-start-tutorial.md)
- [AI Prompts Reference](docs/ai-prompts-reference.md)

## 🎯 关键特性详解

### 🌍 世界生成
- **生物群系多样性**：森林、沙漠、苔原、沼泽、平原等
- **真实地形**：基于 Perlin 噪声的高度图 + 侵蚀模拟
- **生态系统模拟**：动态动植物种群变化
- **资源分布**：符合自然规律的矿物与资源生成
- **无限世界**：基于区块的无缝世界流式加载

### 🤖 AI驱动NPC
- **上下文感知**：理解环境与局势
- **记忆系统**：长期记忆与关系演化
- **目标导向行为**：多步骤任务规划
- **自然对话**：AI生成的真实对话
- **自适应学习**：根据玩家互动不断进化

### ⚔️ 高级战斗系统
- **操作技巧为主**：时机与站位至关重要
- **连招系统**：连击形成更高伤害
- **防御机制**：格挡、闪避、反击
- **状态效果**：增益、减益与环境危害
- **成长系统**：技能树与装备升级

## 🤖 AI 集成

### 🧠 Quantelix AI — https://quantelixai.com
提供高级游戏AI解决方案：
- 智能NPC对话生成
- 动态任务设计
- 程序化内容生成
- 实时行为适配

### 🌌 Nebulix QChat — https://nebulix.quantelixai.com
下一代AI驱动的即时通讯平台：
- 内置SUTE模式，可以随时随地的进行编程
- 企业级通讯支持
- 自研曲线加密通讯技术
- 多语言支持

### 🔗 支持的 AI API
- **DeepSeek**：代码生成与技术文档
- **Kimi**：创意写作与叙事内容
- **OpenAI**：通用AI集成
- **自定义模型**：可扩展架构支持任意AI服务

### 性能特性
- **对象池**：高效内存管理
- **区块化加载**：无加载界面的世界流式加载
- **空间分区**：优化碰撞检测与渲染
- **智能缓存**：AI响应缓存提升性能
- **移动端优化**：触控与性能调优

### 🔗 快速链接
- **Quantelix AI**：https://quantelixai.com/ — 高级游戏AI解决方案
- **Nebulix AI**：https://nebulix.quantelixai.com — 次世代游戏AI平台
- **技术文档**：见上方“📖 文档”章节
- **快速开始**：查看 [快速入门教程](files/快速入门教程.md)
- **AI集成**：了解上方“🤖 AI 集成”章节

## 🐛 问题反馈

遇到问题？请通过以下方式反馈：

- [提交Issue](https://github.com/Quantelix-AI/Quantum-Sandbox-Game/issues)
- [加入Discord社区](https://discord.gg/wFpx5Pwd)
- 发送邮件至 support@github.quantelixai.com

## 📊 性能指标

当前版本的性能基准：

| 指标 | 目标值 | 当前值 |
|------|--------|--------|
| 帧率 | ≥60 FPS | 58-62 FPS |
| 内存占用 | <2GB | 1.8GB |
| 区块加载 | <100ms | 85ms |
| AI响应 | <2s | 1.5s |

## 🏆 致谢

特别感谢以下开源项目：

- [PixiJS](https://pixijs.com/) - 强大的2D渲染引擎
- [Matter.js](https://brm.io/matter-js/) - 优秀的物理引擎
- [Vite](https://vitejs.dev/) - 快速的构建工具
- [DeepSeek](https://www.deepseek.com/) - AI能力支持
- [Kimi](https://www.moonshot.cn/) - 对话AI支持

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 👥 核心团队

- **项目负责人** - [@HSYicoX](https://github.com/HSYicoX)
- **技术架构** - [@HSYicoX](https://github.com/HSYicoX)
- **AI工程** - [@HSYicoX](https://github.com/HSYicoX)
- **美术设计** - [@HSYicoX](https://github.com/HSYicoX)

## 💬 联系我们

- 官网：https://quantelixai.com
- Discord：https://discord.gg/wFpx5Pwd
- Twitter：[@QuantelixAI](https://twitter.com/QuantelixAI)
- Email：contact@github.quantelixai.com

---

<p align="center">
  <strong>用AI重新定义沙盒游戏</strong><br>
  Made with ❤️ by Game Dev Team
</p>

<p align="center">
  <a href="#top">回到顶部</a>
</p>
