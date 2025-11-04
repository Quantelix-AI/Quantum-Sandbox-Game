import { BiomeType, Vector2, WorldChunk } from "@/types";
import { PerlinNoise } from "@/utils/PerlinNoise";

export interface ChunkManagerOptions {
  chunkSize: number;
  viewDistance: number;
  seed: number;
}

export class ChunkManager {
  private readonly chunks: Map<string, WorldChunk> = new Map();
  private readonly noise: PerlinNoise;
  private mapSize: number = 50; // 地图大小（50x50个区块）
  private isPreloaded: boolean = false; // 是否已预加载

  constructor(private readonly options: ChunkManagerOptions) {
    this.noise = new PerlinNoise(options.seed);
  }

  getChunkKey(gridX: number, gridY: number): string {
    return `${gridX}:${gridY}`;
  }

  getChunkAt(position: Vector2): WorldChunk {
    const gridX = Math.floor(position.x / this.options.chunkSize);
    const gridY = Math.floor(position.y / this.options.chunkSize);
    const key = this.getChunkKey(gridX, gridY);
    const chunk = this.chunks.get(key);
    if (!chunk) {
      return this.generateChunk(gridX, gridY);
    }
    return chunk;
  }

  getActiveChunks(): WorldChunk[] {
    return [...this.chunks.values()];
  }

  /**
   * 预加载整个地图
   */
  async preloadMap(): Promise<void> {
    if (this.isPreloaded) {
      console.log('地图已经预加载完毕');
      return;
    }

    console.log(`开始预加载地图，大小: ${this.mapSize}x${this.mapSize} 个区块`);
    const startTime = performance.now();
    
    const halfSize = Math.floor(this.mapSize / 2);
    let loadedChunks = 0;
    const totalChunks = this.mapSize * this.mapSize;

    // 预加载所有区块
    for (let x = -halfSize; x <= halfSize; x++) {
      for (let z = -halfSize; z <= halfSize; z++) {
        const key = this.getChunkKey(x, z);
        if (!this.chunks.has(key)) {
          const chunk = this.generateChunk(x, z);
          this.chunks.set(key, chunk);
          loadedChunks++;
        }
      }
      
      // 每加载一行区块就让出控制权，避免阻塞UI
      if (x % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }

    const endTime = performance.now();
    console.log(`地图预加载完成！加载了 ${loadedChunks}/${totalChunks} 个区块，耗时: ${(endTime - startTime).toFixed(2)}ms`);
    this.isPreloaded = true;
  }

  /**
   * 获取指定位置的区块
   */
  getChunk(x: number, z: number): WorldChunk | undefined {
    const key = this.getChunkKey(x, z);
    return this.chunks.get(key);
  }

  /**
   * 获取所有已加载的区块
   */
  getAllChunks(): WorldChunk[] {
    return Array.from(this.chunks.values());
  }

  /**
   * 检查地图是否已预加载
   */
  isMapPreloaded(): boolean {
    return this.isPreloaded;
  }

  update(center: Vector2): void {
    // 如果地图已预加载，则不需要动态加载/卸载区块
    if (this.isPreloaded) {
      return;
    }

    console.log(`[ChunkManager] update 被调用，中心位置: (${center.x}, ${center.y})`);
    
    const chunkX = Math.floor(center.x / this.options.chunkSize);
    const chunkZ = Math.floor(center.y / this.options.chunkSize);
    
    console.log(`[ChunkManager] 计算得到的区块坐标: (${chunkX}, ${chunkZ})`);

    // 生成需要的区块（仅在未预加载时）
    for (let x = chunkX - this.options.viewDistance; x <= chunkX + this.options.viewDistance; x++) {
      for (let z = chunkZ - this.options.viewDistance; z <= chunkZ + this.options.viewDistance; z++) {
        const key = this.getChunkKey(x, z);
        if (!this.chunks.has(key)) {
          console.log(`[ChunkManager] 生成新区块: (${x}, ${z})`);
          const chunk = this.generateChunk(x, z);
          this.chunks.set(key, chunk);
        }
      }
    }

    // 注意：预加载模式下不删除任何区块，保持所有区块都加载
    console.log(`[ChunkManager] 当前活跃区块数量: ${this.chunks.size}`);
  }

  private generateChunk(gridX: number, gridY: number): WorldChunk {
    const key = this.getChunkKey(gridX, gridY);
    const biome = this.sampleBiome(gridX, gridY);
    const chunk: WorldChunk = {
      id: key,
      gridX,
      gridY,
      biome,
      entities: new Set(),
      generatedAt: performance.now(),
    };
    return chunk;
  }

  private sampleBiome(gridX: number, gridY: number): BiomeType {
    const value = this.noise.noise(gridX * 0.05, gridY * 0.05, 0);
    if (value < 0.2) return "tundra";
    if (value < 0.4) return "swamp";
    if (value < 0.6) return "forest";
    if (value < 0.8) return "plains";
    return "desert";
  }
}
