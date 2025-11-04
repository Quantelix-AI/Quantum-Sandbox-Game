# Complete Development Guide

A comprehensive guide for developing with the Quantelix AI Game Engine.

## Table of Contents
- [Overview](#overview)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Core Systems](#core-systems)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Deployment](#deployment)
- [Best Practices](#best-practices)
- [Related Documentation](#related-documentation)

## Overview

The Quantelix AI Game Engine is a TypeScript-based 2D game engine built on PixiJS, featuring AI-powered NPCs, procedural world generation, and a modular architecture. This guide covers everything you need to know to develop games using this engine.

🔗 **Related Links:**
- [Quantelix AI](https://quantelixai.com/) - AI Platform
- [Nebulix AI](https://nebulix.quantelixai.com) - Advanced AI Solutions

## Project Structure

```
src/
├── ai/                    # AI systems and controllers
│   ├── AIManager.ts      # Main AI management system
│   ├── BehaviorTree.ts   # NPC behavior decision tree
│   ├── DeepSeekController.ts # DeepSeek AI integration
│   └── KimiController.ts # Kimi AI integration
├── core/                  # Core engine systems
│   ├── GameEngine.ts     # Main game engine class
│   ├── EventBus.ts       # Event system for decoupled communication
│   ├── InputManager.ts   # Input handling (mouse, keyboard)
│   └── SystemManager.ts  # System lifecycle management
├── entities/              # Game entities
│   ├── BaseEntity.ts     # Base entity class
│   ├── Player.ts         # Player character
│   ├── NPC.ts           # Non-player characters
│   └── EntityManager.ts  # Entity lifecycle management
├── physics/               # Physics simulation
│   ├── PhysicsEngine.ts  # Matter.js physics integration
│   └── CollisionManager.ts # Collision detection and handling
├── rendering/             # Graphics and rendering
│   ├── RenderingSystem.ts # Main rendering pipeline
│   ├── TerrainRenderer.ts  # Procedural terrain rendering
│   └── Camera.ts          # 2D camera system
├── world/                 # World generation and management
│   ├── WorldManager.ts   # World state and time management
│   ├── ChunkManager.ts   # Chunk-based world loading
│   ├── BiomeSystem.ts    # Biome generation and management
│   └── WeatherSystem.ts  # Dynamic weather simulation
├── ui/                    # User interface
│   └── UIManager.ts      # UI system management
└── utils/                 # Utility functions
    ├── Noise.ts          # Perlin noise generation
    └── MathUtils.ts      # Mathematical utilities
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm
- Modern web browser with WebGL support

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd quantelix-ai-game

# Install dependencies
npm install

# Start development server
npm run dev
```

### Basic Game Setup

```typescript
import { GameEngine } from '@/core/GameEngine';

// Create game engine instance
const game = new GameEngine({
  container: document.getElementById('game-container'),
  seed: 12345, // World generation seed
  maxAiCallsPerHour: 100,
  deepSeekApiKey: 'your-deepseek-key',
  kimiApiKey: 'your-kimi-key'
});

// Initialize and start the game
await game.initialize();
game.start();
```

## Core Systems

### Game Engine

The `GameEngine` class is the central coordinator that manages all game systems:

```typescript
export class GameEngine {
  private readonly systemManager: SystemManager;
  private readonly inputManager: InputManager;
  private readonly physics: PhysicsEngine;
  private readonly world: WorldManager;
  private readonly entities: EntityManager;
  private readonly ai: AIManager;
  
  constructor(options: GameEngineOptions) {
    // Initialize all systems
  }
  
  async initialize(): Promise<void> {
    // Initialize all systems in dependency order
    await this.systemManager.initializeAll();
    
    // Preload map to prevent black areas
    await this.world.preloadMapAndRender(this.rendering.getTerrainRenderer());
  }
}
```

### Entity System

Entities are game objects with physics, rendering, and behavior:

```typescript
export class BaseEntity {
  protected body: Matter.Body;
  protected sprite: Sprite;
  
  constructor(x: number, y: number, type: string) {
    this.body = this.createPhysicsBody(x, y);
    this.sprite = this.createSprite();
  }
  
  update(delta: number): void {
    // Sync physics body with sprite position
    this.sprite.position.set(this.body.position.x, this.body.position.y);
  }
}
```

### AI System

AI-powered NPCs use behavior trees and AI APIs:

```typescript
export class AIManager {
  private readonly behaviorTree: BehaviorTree;
  private readonly deepSeek: DeepSeekController;
  private readonly kimi: KimiController;
  
  async requestDialogue(npc: NPC, playerMessage: string): Promise<DialogueResponse> {
    const context: DialogueContext = {
      npcName: npc.name,
      playerMessage,
      // ... other context
    };
    
    return await this.kimi.generateDialogue(context);
  }
  
  async evaluateBehavior(state: NPCState): Promise<NPCBehaviorDecision> {
    const context: BehaviorContext = {
      npcId: state.npc.id,
      hunger: state.hunger,
      health: state.health,
      // ... other context
    };
    
    return await this.deepSeek.decideBehavior(context);
  }
}
```

### World Generation

Procedural world generation using Perlin noise:

```typescript
export class ChunkManager {
  private readonly noise: PerlinNoise;
  
  async preloadMap(): Promise<void> {
    // Preload 50x50 chunks to prevent black areas
    const chunks: WorldChunk[] = [];
    
    for (let x = -25; x < 25; x++) {
      for (let z = -25; z < 25; z++) {
        const biome = this.generateBiome(x, z);
        const chunk = new WorldChunk(x, z, biome);
        chunks.push(chunk);
      }
    }
    
    // Store chunks for later rendering
    this.chunks.set(chunks);
  }
  
  private generateBiome(x: number, z: number): BiomeType {
    const elevation = this.noise.getElevation(x, z);
    const moisture = this.noise.getMoisture(x, z);
    const temperature = this.noise.getTemperature(x, z);
    
    // Determine biome based on climate parameters
    return this.biomeSystem.determineBiome(elevation, moisture, temperature);
  }
}
```

## Development Workflow

### 1. Creating New Entities

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
    // Custom update logic
  }
}
```

### 2. Adding New Systems

```typescript
export class MySystem implements GameSystem {
  public readonly name = 'my-system';
  public readonly priority = 60; // Lower = earlier execution
  
  constructor(private readonly dependencies: Dependencies) {}
  
  initialize(): void {
    // System initialization
  }
  
  update(delta: number): void {
    // Per-frame updates
  }
  
  destroy(): void {
    // Cleanup resources
  }
}
```

### 3. Event System

Use the event bus for decoupled communication:

```typescript
// Emit events
this.eventBus.emit('player:damage', { amount: 10, source: 'enemy' });

// Listen to events
this.eventBus.on('player:damage', ({ amount, source }) => {
  console.log(`Player took ${amount} damage from ${source}`);
});
```

### 4. Input Handling

```typescript
// Keyboard input
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

// Mouse input
this.inputManager.on('click', (event) => {
  const worldPos = this.rendering.screenToWorld(event.x, event.y);
  this.player.moveTo(worldPos);
});
```

## Testing

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { MyEntity } from '@/entities/MyEntity';

describe('MyEntity', () => {
  it('should initialize with correct properties', () => {
    const entity = new MyEntity(100, 200);
    
    expect(entity.x).toBe(100);
    expect(entity.y).toBe(200);
    expect(entity.type).toBe('my-entity');
  });
  
  it('should update position correctly', () => {
    const entity = new MyEntity(0, 0);
    const initialPos = entity.getPosition();
    
    entity.update(16); // 16ms frame
    
    expect(entity.getPosition()).not.toEqual(initialPos);
  });
});
```

### Integration Tests

```typescript
import { GameEngine } from '@/core/GameEngine';

describe('Game Integration', () => {
  it('should initialize all systems', async () => {
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

## Deployment

### Build Configuration

```bash
# Production build
npm run build

# Preview production build
npm run preview
```

### Environment Variables

```env
VITE_DEEPSEEK_API_KEY=your-deepseek-key
VITE_DEEPSEEK_BASE_URL=https://api.deepseek.com
VITE_KIMI_API_KEY=your-kimi-key
VITE_KIMI_BASE_URL=https://api.kimi.com
```

### Performance Optimization

- Enable gzip compression on your web server
- Use CDN for static assets
- Implement service worker for offline capability
- Optimize sprite atlases and texture packing

## Best Practices

### 1. Entity Design
- Keep entities focused on single responsibilities
- Use composition over inheritance for complex behaviors
- Always clean up resources in entity destroy methods

### 2. Performance
- Use object pooling for frequently created/destroyed entities
- Implement level-of-detail (LOD) for distant objects
- Batch similar rendering operations
- Profile regularly using browser dev tools

### 3. AI Integration
- Cache AI responses to reduce API calls
- Implement fallback behaviors when AI services are unavailable
- Monitor AI call budgets and implement rate limiting
- Log AI interactions for debugging and improvement

### 4. World Generation
- Use deterministic generation for reproducible worlds
- Implement chunk-based loading for large worlds
- Cache generated chunks to disk when possible
- Use multiple noise octaves for realistic terrain

### 5. Error Handling
- Implement graceful degradation for missing AI services
- Add comprehensive error logging and monitoring
- Use TypeScript strict mode for better type safety
- Implement user-friendly error messages

## Related Documentation

- [Architecture Overview](./architecture.md) - System architecture and design patterns
- [API Reference](./api-reference.md) - Complete API documentation
- [Performance Optimization](./performance.md) - Performance tuning and optimization strategies
- [Game Mechanics](./game-mechanics.md) - Core game systems and mechanics
- [AI Behavior System](./ai-behavior.md) - AI architecture and behavior implementation
- [World Generation](./world-generation.md) - Procedural world generation systems  
- [Performance Optimization](performance.md) - Optimization strategies and benchmarks
- [Game Mechanics](game-mechanics.md) - Core gameplay systems
- [AI Behavior System](ai-behavior.md) - NPC intelligence and decision making
- [World Generation](world-generation.md) - Procedural generation algorithms

---

*For more information, visit [Quantelix AI](https://quantelixai.com/) and [Nebulix AI](https://nebulix.quantelixai.com)*