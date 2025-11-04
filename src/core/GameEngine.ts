import { EventBus } from "./EventBus";
import { GameSystem, SystemManager } from "./SystemManager";
import { InputManager } from "./InputManager";
import { PhysicsEngine } from "@/physics/PhysicsEngine";
import { CollisionManager } from "@/physics/CollisionManager";
import { RenderingSystem, RenderingOptions } from "@/rendering/RenderingSystem";
import { WorldManager } from "@/world/WorldManager";
import { EntityManager } from "@/entities/EntityManager";
import { AIManager, AIManagerOptions } from "@/ai/AIManager";
import { UIManager } from "@/ui/UIManager";
import { Player } from "@/entities/Player";
import { GameConfig } from "@/types";

export interface GameEngineOptions {
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

export class GameEngine {
  private readonly eventBus = new EventBus();
  private readonly systemManager = new SystemManager();
  private readonly inputManager = new InputManager();

  private readonly physics = new PhysicsEngine();
  private readonly collisions: CollisionManager;
  private readonly rendering: RenderingSystem;
  private readonly world: WorldManager;
  private readonly entities: EntityManager;
  private readonly ai: AIManager;
  private readonly ui: UIManager;

  private player!: Player;
  private started = false;

  constructor(private readonly options: GameEngineOptions) {
    // 使用固定的1280x720尺寸，而不是window.innerWidth/Height
    const width = options.width ?? 1280;
    const height = options.height ?? 720;

    console.log(`[GameEngine] 初始化游戏引擎，尺寸: ${width}x${height}`);

    const renderingOptions: RenderingOptions = {
      container: options.container,
      width,
      height,
      background: 0x0a0a0a,
    };

    const gameConfig: GameConfig = {
      worldSizeKm: 1100,
      chunkSizeMeters: 256,
      seed: options.seed,
      maxAiCallsPerHour: options.maxAiCallsPerHour,
      enableDebug: Boolean(options.debug),
    };

    this.rendering = new RenderingSystem(renderingOptions);
    this.world = new WorldManager(gameConfig, this.eventBus);
    this.entities = new EntityManager(this.physics, this.rendering, this.world, this.eventBus);
    this.collisions = new CollisionManager(this.physics.engine, this.eventBus);

    const aiOptions: AIManagerOptions = {
      maxCallsPerHour: options.maxAiCallsPerHour,
      deepSeek: {
        apiKey: options.deepSeekApiKey,
        baseUrl: options.deepSeekBaseUrl,
      },
      kimi: {
        apiKey: options.kimiApiKey,
        baseUrl: options.kimiBaseUrl,
      },
    };

    this.ai = new AIManager(this.world, this.entities, this.eventBus, aiOptions);
    this.ui = new UIManager(this.ai, this.eventBus);

    [this.physics, this.world, this.entities, this.ai, this.rendering, this.ui].forEach((system) =>
      this.systemManager.register(system as GameSystem),
    );
  }

  async initialize(): Promise<void> {
    await this.systemManager.initializeAll();
    
    // 获取canvas元素并传递给InputManager
    const app = this.rendering.getApplication();
    const canvas = app.canvas as HTMLCanvasElement;
    this.inputManager.initialize(canvas);
    
    this.collisions.initialize();
    
    // 预加载地图并渲染
    console.log('[GameEngine] 开始预加载地图并渲染...');
    await this.world.preloadMapAndRender(this.rendering.getTerrainRenderer());
    console.log('[GameEngine] 地图预加载和渲染完成');
    
    await this.bootstrapWorld();
  }

  start(): void {
    if (this.started) return;
    const app = this.rendering.getApplication();
    app.ticker.add((ticker) => {
      this.systemManager.updateAll(ticker.deltaMS);
    });
    this.rendering.getCamera().follow(this.player.getSprite());
    this.started = true;
  }

  stop(): void {
    if (!this.started) return;
    this.rendering.getApplication().ticker.stop();
    this.systemManager.destroyAll();
    this.collisions.destroy();
    this.inputManager.destroy();
    this.started = false;
  }

  getEventBus(): EventBus {
    return this.eventBus;
  }

  getEntityManager(): EntityManager {
    return this.entities;
  }

  getUIManager(): UIManager {
    return this.ui;
  }

  getAIManager(): AIManager {
    return this.ai;
  }

  getWorldManager(): WorldManager {
    return this.world;
  }

  private async bootstrapWorld(): Promise<void> {
    console.log(`[GameEngine] 开始创建游戏世界`);
    console.log(`[GameEngine] 准备创建玩家实体`);
    
    try {
      console.log(`[GameEngine] 调用 new Player() 构造函数`);
      this.player = new Player(400, 400, this.inputManager);
      console.log(`[GameEngine] Player 构造函数完成，player 对象:`, this.player);
      console.log(`[GameEngine] 玩家创建完成，添加到实体管理器`);
      
      console.log(`[GameEngine] 调用 entities.addEntity()`);
      this.entities.addEntity(this.player);
      console.log(`[GameEngine] addEntity 调用完成`);
      console.log(`[GameEngine] 玩家已添加到实体管理器`);
      
      console.log(`[GameEngine] 准备生成默认NPC`);
      this.entities.spawnDefaultNPCs();
      console.log(`[GameEngine] 默认NPC生成完成`);
      
    } catch (error) {
      console.error(`[GameEngine] 创建实体时出错:`, error);
      console.error(`[GameEngine] 错误堆栈:`, error.stack);
      throw error;
    }
    
    console.log(`[GameEngine] 设置世界焦点位置`);
    console.log(`[GameEngine] 玩家物理体位置:`, this.player.getBody().position);
    this.world.focusPosition(this.player.getBody().position);
    console.log(`[GameEngine] 世界焦点位置设置完成`);
    
    console.log(`[GameEngine] 设置相机跟随`);
    this.rendering.getCamera().follow(this.player.getSprite());
    console.log(`[GameEngine] 相机跟随设置完成`);
    
    console.log(`[GameEngine] 游戏世界创建完成`);
  }
}
