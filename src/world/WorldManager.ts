import { EventBus } from "@/core/EventBus";
import { GameSystem } from "@/core/SystemManager";
import { GameConfig, Vector2, WorldChunk } from "@/types";
import { ChunkManager, ChunkManagerOptions } from "./ChunkManager";
import { BiomeSystem } from "./BiomeSystem";
import { WeatherState, WeatherSystem } from "./WeatherSystem";
import { TerrainRenderer } from "@/rendering/TerrainRenderer";

export interface WorldState {
  timeOfDay: number;
  dayCount: number;
  weather: WeatherState;
  activeChunks: WorldChunk[];
}

export class WorldManager implements GameSystem {
  public readonly name = "world";
  public readonly priority = 80;

  private readonly chunkManager: ChunkManager;
  private readonly biomeSystem = new BiomeSystem();
  private readonly weatherSystem = new WeatherSystem();
  private terrainRenderer?: TerrainRenderer;

  private timeOfDay = 12; // 0-24
  private dayCount = 0;

  private readonly dayLengthSeconds = 20 * 60; // 20 minutes per in-game day

  constructor(private readonly config: GameConfig, private readonly eventBus: EventBus) {
    const chunkOptions: ChunkManagerOptions = {
      chunkSize: config.chunkSizeMeters,
      viewDistance: 2,
      seed: config.seed,
    };
    this.chunkManager = new ChunkManager(chunkOptions);
  }

  initialize(): void {
    console.log('[WorldManager] 开始初始化世界管理器');
    this.weatherSystem.initialize();
    console.log('[WorldManager] 世界管理器初始化完成');
  }

  async preloadMapAndRender(terrainRenderer: TerrainRenderer): Promise<void> {
    console.log('[WorldManager] 开始预加载地图和渲染...');
    this.terrainRenderer = terrainRenderer;
    
    // 预加载整个地图
    console.log('[WorldManager] 开始预加载地图...');
    await this.chunkManager.preloadMap();
    
    // 批量渲染所有预加载的区块
    console.log('[WorldManager] 开始渲染预加载的区块...');
    const allChunks = this.chunkManager.getAllChunks();
    this.terrainRenderer.renderChunks(allChunks);
    console.log(`[WorldManager] 已渲染 ${allChunks.length} 个区块`);
    
    console.log('[WorldManager] 地图预加载和渲染完成');
  }



  update(deltaMs: number): void {
    const deltaSeconds = deltaMs / 1000;
    this.weatherSystem.update(deltaSeconds);
    this.advanceTime(deltaSeconds);
  }

  postUpdate(): void {
    this.eventBus.emit("world:state", this.getState());
  }

  focusPosition(position: Vector2): void {
    console.log(`[WorldManager] focusPosition 被调用，位置: (${position.x}, ${position.y})`);
    
    if (!this.terrainRenderer) {
      console.warn('[WorldManager] terrainRenderer 未设置，无法渲染地形');
      return;
    }

    // 如果地图已预加载，则不需要动态处理区块
    if (this.chunkManager.isMapPreloaded()) {
      console.log('[WorldManager] 地图已预加载，无需动态处理区块');
      return;
    }

    console.log(`[WorldManager] terrainRenderer 已设置: ${this.terrainRenderer ? 'true' : 'false'}`);

    // 更新区块管理器（仅在未预加载时）
    this.chunkManager.update(position);

    // 获取当前需要渲染的区块
    const chunkX = Math.floor(position.x / 64);
    const chunkZ = Math.floor(position.y / 64);
    const viewDistance = 5;

    console.log(`[WorldManager] 当前区块坐标: (${chunkX}, ${chunkZ}), 视距: ${viewDistance}`);

    // 渲染视距内的所有区块
    for (let x = chunkX - viewDistance; x <= chunkX + viewDistance; x++) {
      for (let z = chunkZ - viewDistance; z <= chunkZ + viewDistance; z++) {
        const chunk = this.chunkManager.getChunk(x, z);
        if (chunk) {
          console.log(`[WorldManager] 渲染区块: (${x}, ${z})`);
          this.terrainRenderer.renderChunk(chunk);
        } else {
          console.log(`[WorldManager] 区块不存在: (${x}, ${z})`);
        }
      }
    }

    console.log('[WorldManager] focusPosition 处理完成');
  }

  getChunkAt(position: Vector2): WorldChunk {
    return this.chunkManager.getChunkAt(position);
  }

  getWeatherState(): WeatherState {
    return this.weatherSystem.getState();
  }

  getState(): WorldState {
    return {
      timeOfDay: this.timeOfDay,
      dayCount: this.dayCount,
      weather: this.weatherSystem.getState(),
      activeChunks: this.chunkManager.getActiveChunks(),
    };
  }

  private advanceTime(deltaSeconds: number): void {
    const dayProgress = deltaSeconds / this.dayLengthSeconds * 24;
    this.timeOfDay += dayProgress;
    if (this.timeOfDay >= 24) {
      this.timeOfDay -= 24;
      this.dayCount += 1;
      this.eventBus.emit("world:new-day", { day: this.dayCount });
    }
  }
}
