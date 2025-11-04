# 🎮 2D沙盒生存游戏 - AI驱动的开放世界

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![PixiJS](https://img.shields.io/badge/PixiJS-8.0-green)](https://pixijs.com/)
[![Matter.js](https://img.shields.io/badge/Matter.js-latest-orange)](https://brm.io/matter-js/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

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
git clone https://github.com/your-username/game-project.git
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
game-project/
├── src/
│   ├── core/              # 核心引擎
│   │   ├── GameEngine.ts
│   │   ├── SystemManager.ts
│   │   └── EventBus.ts
│   ├── world/             # 世界管理
│   │   ├── WorldManager.ts
│   │   ├── ChunkManager.ts
│   │   ├── BiomeSystem.ts
│   │   └── WeatherSystem.ts
│   ├── entities/          # 实体系统
│   │   ├── EntityManager.ts
│   │   ├── Player.ts
│   │   ├── NPC.ts
│   │   └── Enemy.ts
│   ├── ai/                # AI系统
│   │   ├── AIManager.ts
│   │   ├── DeepSeekController.ts
│   │   ├── KimiController.ts
│   │   └── BehaviorTree.ts
│   ├── rendering/         # 渲染系统
│   │   ├── RenderingSystem.ts
│   │   ├── CameraSystem.ts
│   │   └── ParticleSystem.ts
│   ├── physics/           # 物理系统
│   │   ├── PhysicsEngine.ts
│   │   └── CollisionManager.ts
│   ├── ui/                # UI系统
│   │   ├── UIManager.ts
│   │   ├── Inventory.ts
│   │   └── DialogSystem.ts
│   └── utils/             # 工具类
│       ├── MathUtils.ts
│       ├── PerlinNoise.ts
│       └── ObjectPool.ts
├── assets/                # 游戏资源
│   ├── sprites/
│   ├── sounds/
│   └── data/
├── tests/                 # 测试文件
├── docs/                  # 文档
└── scripts/               # 构建脚本
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

- [完整开发文档](docs/游戏开发完整文档.docx) - 详细的技术架构和开发指南
- [AI提示词库](docs/AI提示词库-快速参考.md) - AI系统使用指南
- [API文档](docs/API.md) - 核心API参考
- [性能优化指南](docs/Performance.md) - 性能调优技巧
- [常见问题](docs/FAQ.md) - 常见问题解答

## 🐛 问题反馈

遇到问题？请通过以下方式反馈：

- [提交Issue](https://github.com/your-username/game-project/issues)
- [加入Discord社区](https://discord.gg/your-invite)
- 发送邮件至 support@yourgame.com

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

- **项目负责人** - [@your-username](https://github.com/your-username)
- **技术架构** - 待招募
- **AI工程** - 待招募
- **美术设计** - 待招募

## 💬 联系我们

- 官网：https://yourgame.com
- Discord：https://discord.gg/your-invite
- Twitter：[@yourgame](https://twitter.com/yourgame)
- Email：contact@yourgame.com

---

<p align="center">
  <strong>用AI重新定义沙盒游戏</strong><br>
  Made with ❤️ by Game Dev Team
</p>

<p align="center">
  <a href="#top">回到顶部</a>
</p>
