# 🚀 Quick Start Tutorial - Get Started in 30 Minutes

> **中文版**: [快速入门教程](../files/快速入门教程.md)

## 📚 Tutorial Overview

This tutorial will guide you through building a game foundation in 30 minutes, creating a working prototype.

**What you'll learn:**
- ✅ Project initialization and dependency installation
- ✅ Creating your first game scene
- ✅ Adding player character and basic controls
- ✅ Implementing simple physics interactions
- ✅ Integrating AI-generated NPC dialogue

**Prerequisites:**
- Basic TypeScript/JavaScript knowledge
- Understanding of npm/yarn package management
- Basic command line operations

---

## Step 1: Project Initialization (5 minutes)

### 1.1 Create Project Directory

```bash
mkdir my-sandbox-game
cd my-sandbox-game
npm init -y
```

### 1.2 Install Core Dependencies

```bash
# Install PixiJS and Matter.js
npm install pixi.js matter-js

# Install TypeScript and build tools
npm install -D typescript vite @types/node

# Install AI SDK (if using)
npm install openai
```

### 1.3 Configure TypeScript

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react",
    "strict": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 1.4 Configure Vite

Create `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
  },
});
```

### 1.5 Create Basic Directory Structure

```bash
mkdir -p src/{core,entities,rendering,physics,ai,utils}
mkdir -p assets/{sprites,sounds}
```

### 1.6 Create Entry HTML

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Sandbox Game</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #0a0a0a;
    }
    #game-container {
      width: 100vw;
      height: 100vh;
    }
  </style>
</head>
<body>
  <div id="game-container"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

---

## Step 2: Create Game Engine (10 minutes)

### 2.1 Create Vector Utility Class

Create `src/utils/Vector2.ts`:

```typescript
export class Vector2 {
  constructor(
    public x: number = 0,
    public y: number = 0
  ) {}

  add(v: Vector2): Vector2 {
    return new Vector2(this.x + v.x, this.y + v.y);
  }

  subtract(v: Vector2): Vector2 {
    return new Vector2(this.x - v.x, this.y - v.y);
  }

  multiply(scalar: number): Vector2 {
    return new Vector2(this.x * scalar, this.y * scalar);
  }

  distance(v: Vector2): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  normalize(): Vector2 {
    const len = Math.sqrt(this.x * this.x + this.y * this.y);
    return len > 0 ? new Vector2(this.x / len, this.y / len) : new Vector2();
  }
}
```

### 2.2 Create Game Engine Core

Create `src/core/GameEngine.ts`:

```typescript
import * as PIXI from 'pixi.js';
import Matter from 'matter-js';

export class GameEngine {
  private app: PIXI.Application;
  private physicsEngine: Matter.Engine;
  private lastTime: number = 0;
  private isRunning: boolean = false;

  constructor(container: HTMLElement) {
    // Initialize PixiJS
    this.app = new PIXI.Application({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x0a0a0a,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
    });

    container.appendChild(this.app.view as HTMLCanvasElement);

    // Initialize Matter.js physics engine
    this.physicsEngine = Matter.Engine.create({
      gravity: { x: 0, y: 0.5 }, // Custom gravity
    });

    // Window resize handling
    window.addEventListener('resize', () => this.onResize());
    this.onResize();
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.app.renderer.resize(width, height);
  }

  public start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private gameLoop = (): void => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.update(deltaTime);
    requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number): void {
    // Update physics engine
    Matter.Engine.update(this.physicsEngine, deltaTime * 1000);
  }

  public getApp(): PIXI.Application {
    return this.app;
  }

  public getPhysicsEngine(): Matter.Engine {
    return this.physicsEngine;
  }

  public stop(): void {
    this.isRunning = false;
  }
}
```

---

## Step 3: Create Player Character (8 minutes)

### 3.1 Create Entity Base Class

Create `src/entities/Entity.ts`:

```typescript
import * as PIXI from 'pixi.js';
import Matter from 'matter-js';
import { Vector2 } from '../utils/Vector2';

export abstract class Entity {
  protected sprite: PIXI.Graphics;
  protected body: Matter.Body;
  protected position: Vector2;

  constructor(x: number, y: number) {
    this.position = new Vector2(x, y);
    this.sprite = new PIXI.Graphics();
    this.body = this.createPhysicsBody();
  }

  protected abstract createPhysicsBody(): Matter.Body;

  public update(deltaTime: number): void {
    // Sync physics position to rendering
    this.position.x = this.body.position.x;
    this.position.y = this.body.position.y;
    this.sprite.position.set(this.position.x, this.position.y);
    this.sprite.rotation = this.body.angle;
  }

  public getSprite(): PIXI.Graphics {
    return this.sprite;
  }

  public getBody(): Matter.Body {
    return this.body;
  }

  public abstract render(): void;
}
```

### 3.2 Create Player Class

Create `src/entities/Player.ts`:

```typescript
import Matter from 'matter-js';
import { Entity } from './Entity';
import { Vector2 } from '../utils/Vector2';

export class Player extends Entity {
  private speed: number = 200;
  private jumpForce: number = 10;
  private isOnGround: boolean = false;
  private moveDirection: Vector2 = new Vector2();

  constructor(x: number, y: number) {
    super(x, y);
    this.render();
    this.setupControls();
  }

  protected createPhysicsBody(): Matter.Body {
    return Matter.Bodies.rectangle(
      this.position.x,
      this.position.y,
      40, // Width
      60, // Height
      {
        restitution: 0.1,
        friction: 0.5,
        density: 0.001,
      }
    );
  }

  private setupControls(): void {
    const keys: { [key: string]: boolean } = {};

    window.addEventListener('keydown', (e) => {
      keys[e.key] = true;

      // Jump
      if (e.key === ' ' && this.isOnGround) {
        Matter.Body.applyForce(this.body, this.body.position, {
          x: 0,
          y: -this.jumpForce,
        });
      }
    });

    window.addEventListener('keyup', (e) => {
      keys[e.key] = false;
    });

    // Movement logic
    const updateMovement = () => {
      this.moveDirection.x = 0;

      if (keys['a'] || keys['ArrowLeft']) {
        this.moveDirection.x = -1;
      }
      if (keys['d'] || keys['ArrowRight']) {
        this.moveDirection.x = 1;
      }

      requestAnimationFrame(updateMovement);
    };

    updateMovement();
  }

  public update(deltaTime: number): void {
    super.update(deltaTime);

    // Apply horizontal movement
    if (this.moveDirection.x !== 0) {
      Matter.Body.setVelocity(this.body, {
        x: this.moveDirection.x * this.speed * deltaTime,
        y: this.body.velocity.y,
      });
    }

    // Detect if on ground (simple version)
    this.isOnGround = Math.abs(this.body.velocity.y) < 0.1;
  }

  public render(): void {
    this.sprite.clear();
    this.sprite.beginFill(0x4ECDC4); // Cyan color
    this.sprite.drawRect(-20, -30, 40, 60);
    this.sprite.endFill();
  }
}
```

---

## Step 4: Create Game World (5 minutes)

### 4.1 Create Ground

Create `src/entities/Ground.ts`:

```typescript
import Matter from 'matter-js';
import { Entity } from './Entity';

export class Ground extends Entity {
  constructor(x: number, y: number, width: number, height: number) {
    super(x, y);
    this.createSprite(width, height);
  }

  protected createPhysicsBody(): Matter.Body {
    return Matter.Bodies.rectangle(
      this.position.x,
      this.position.y,
      800,
      50,
      {
        isStatic: true, // Static object, unaffected by gravity
      }
    );
  }

  private createSprite(width: number, height: number): void {
    this.sprite.clear();
    this.sprite.beginFill(0x2C3E50); // Dark gray
    this.sprite.drawRect(-width / 2, -height / 2, width, height);
    this.sprite.endFill();
  }

  public render(): void {
    // Ground doesn't need repeated rendering
  }
}
```

### 4.2 Assemble Game Scene

Create `src/main.ts`:

```typescript
import { GameEngine } from './core/GameEngine';
import { Player } from './entities/Player';
import { Ground } from './entities/Ground';
import Matter from 'matter-js';

// Initialize game
const container = document.getElementById('game-container')!;
const engine = new GameEngine(container);
const app = engine.getApp();
const physicsEngine = engine.getPhysicsEngine();

// Create player
const player = new Player(400, 200);
app.stage.addChild(player.getSprite());
Matter.World.add(physicsEngine.world, player.getBody());

// Create ground
const ground = new Ground(400, 550, 800, 50);
app.stage.addChild(ground.getSprite());
Matter.World.add(physicsEngine.world, ground.getBody());

// Create some platforms
const platforms = [
  new Ground(200, 400, 200, 20),
  new Ground(600, 350, 200, 20),
  new Ground(400, 250, 150, 20),
];

platforms.forEach((platform) => {
  app.stage.addChild(platform.getSprite());
  Matter.World.add(physicsEngine.world, platform.getBody());
});

// Game loop
app.ticker.add(() => {
  const deltaTime = app.ticker.deltaMS / 1000;
  player.update(deltaTime);
});

// Start game
engine.start();

console.log('🎮 Game started successfully!');
console.log('Controls:');
console.log('- A/D or Arrow keys left/right: Move');
console.log('- Space: Jump');
```

---

## Step 5: Run the Game (2 minutes)

### 5.1 Add Start Scripts

In `package.json` add:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

### 5.2 Start Development Server

```bash
npm run dev
```

Open browser and visit `http://localhost:3000`, you should see:
- ✅ A character that can move left and right
- ✅ A character that can jump
- ✅ Basic physics collision

**Controls:**
- A/D or Arrow keys ← →: Move
- Space: Jump

---

## Advanced: Add AI Dialogue System (Optional)

### 6.1 Create Simple NPC

Create `src/entities/NPC.ts`:

```typescript
import { Entity } from './Entity';
import Matter from 'matter-js';

export class NPC extends Entity {
  private name: string;
  private dialogues: string[] = [];

  constructor(x: number, y: number, name: string) {
    super(x, y);
    this.name = name;
    this.render();
  }

  protected createPhysicsBody(): Matter.Body {
    return Matter.Bodies.rectangle(
      this.position.x,
      this.position.y,
      30,
      50,
      {
        isStatic: true,
      }
    );
  }

  public render(): void {
    this.sprite.clear();
    this.sprite.beginFill(0xF39C12); // Orange
    this.sprite.drawRect(-15, -25, 30, 50);
    this.sprite.endFill();
    
    // Add name label (simplified)
    this.sprite.beginFill(0x000000, 0.7);
    this.sprite.drawRect(-25, -40, 50, 12);
    this.sprite.endFill();
  }

  public async talk(): Promise<string> {
    // AI API can be connected here
    const responses = [
      "Hello, traveler!",
      "Nice weather today.",
      "Need help?",
      "Be careful of dangers ahead!"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
}
```

### 6.2 Add Interaction Detection

In `src/main.ts` add:

```typescript
// Create NPC
const npc = new NPC(600, 500, "Villager Zhang");
app.stage.addChild(npc.getSprite());
Matter.World.add(physicsEngine.world, npc.getBody());

// Interaction detection
window.addEventListener('keydown', async (e) => {
  if (e.key === 'e' || e.key === 'E') {
    const distance = Math.hypot(
      player.getBody().position.x - npc.getBody().position.x,
      player.getBody().position.y - npc.getBody().position.y
    );
    
    if (distance < 80) {
      const dialogue = await npc.talk();
      console.log(`${npc.name}: ${dialogue}`);
      // UI dialog can be displayed here
      alert(dialogue);
    }
  }
});
```

---

## 🎯 Next Steps

Congratulations! You've created a basic game prototype. Next you can:

### Immediate Features to Try
1. **Visual Enhancement**
   - Add background images
   - Use sprite images instead of solid colors
   - Add particle effects

2. **Extended Gameplay**
   - Add collection system
   - Implement simple combat system
   - Add scoring and timer

3. **Performance Optimization**
   - Implement object pooling
   - Add chunk loading
   - Optimize rendering performance

### Reference Documentation
- 📖 [Complete Development Guide](development-guide.md)
- 🤖 [AI Prompts Reference](ai-prompts-reference.md)
- 📚 [Project README](../README.md)

---

## 🐛 Common Issues

### Q: Game runs slowly?
A: Check for too many entities, try implementing object pooling and frustum culling.

### Q: Physics collision inaccurate?
A: Adjust physics engine precision settings, or use more accurate collision shapes.

### Q: How to debug?
A: Use Chrome DevTools Performance tab to analyze performance bottlenecks.

---

## 💡 Recommended Learning Resources

- [PixiJS Official Tutorial](https://pixijs.io/guides/)
- [Matter.js Examples](https://brm.io/matter-js/demo/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Game Programming Patterns](https://gameprogrammingpatterns.com/)

---

**Completion Time**: ⏱️ About 30 minutes  
**Difficulty Level**: ⭐⭐☆☆☆ (Beginner)  
**Achievement Unlocked**: 🏆 "Game Development Novice"

Happy coding! 🎮✨