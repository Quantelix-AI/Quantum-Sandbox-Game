import { Container, Graphics } from "pixi.js";
import { BiomeType, WorldChunk } from "@/types";

export class TerrainRenderer {
  private readonly terrainContainer: Container;
  private readonly renderedChunks = new Map<string, Graphics>();

  constructor(private readonly stage: Container) {
    console.log(`[TerrainRenderer] 构造函数被调用`);
    this.terrainContainer = new Container();
    this.terrainContainer.zIndex = -1; // 确保地形在最底层
    this.stage.addChild(this.terrainContainer);
    console.log(`[TerrainRenderer] 初始化完成，terrainContainer 已添加到 stage`);
  }

  renderChunk(chunk: WorldChunk, chunkSize: number = 64): void {
    // 避免重复渲染
    if (this.renderedChunks.has(chunk.id)) {
      return; // 减少日志输出以提高性能
    }
    
    const graphics = new Graphics();
    const worldX = chunk.gridX * chunkSize;
    const worldY = chunk.gridY * chunkSize;

    // 根据生物群系选择颜色
    const color = this.getBiomeColor(chunk.biome);
    
    // 绘制地形块
    graphics.rect(0, 0, chunkSize, chunkSize);
    graphics.fill(color);
    
    // 添加一些纹理细节
    this.addBiomeDetails(graphics, chunk.biome, chunkSize);
    
    graphics.position.set(worldX, worldY);
    this.terrainContainer.addChild(graphics);
    this.renderedChunks.set(chunk.id, graphics);
  }

  /**
   * 批量渲染多个区块，提高性能
   */
  renderChunks(chunks: WorldChunk[], chunkSize: number = 64): void {
    console.log(`[TerrainRenderer] 开始批量渲染 ${chunks.length} 个区块`);
    const startTime = performance.now();
    
    let renderedCount = 0;
    for (const chunk of chunks) {
      if (!this.renderedChunks.has(chunk.id)) {
        this.renderChunk(chunk, chunkSize);
        renderedCount++;
      }
    }
    
    const endTime = performance.now();
    console.log(`[TerrainRenderer] 批量渲染完成，实际渲染了 ${renderedCount} 个区块，耗时: ${(endTime - startTime).toFixed(2)}ms`);
  }

  removeChunk(chunkId: string): void {
    const graphics = this.renderedChunks.get(chunkId);
    if (graphics) {
      this.terrainContainer.removeChild(graphics);
      graphics.destroy();
      this.renderedChunks.delete(chunkId);
    }
  }

  private getBiomeColor(biome: BiomeType): number {
    switch (biome) {
      case "forest":
        return 0x2d5016; // 深绿色
      case "desert":
        return 0xc2b280; // 沙色
      case "tundra":
        return 0xe8f4f8; // 浅蓝白色
      case "swamp":
        return 0x4a5d23; // 暗绿色
      case "plains":
        return 0x7cb342; // 草绿色
      default:
        return 0x666666; // 灰色
    }
  }

  private addBiomeDetails(graphics: Graphics, biome: BiomeType, chunkSize: number): void {
    // 添加一些随机的细节点来增加视觉效果
    const detailCount = Math.floor(Math.random() * 8) + 4;
    
    for (let i = 0; i < detailCount; i++) {
      const x = Math.random() * chunkSize;
      const y = Math.random() * chunkSize;
      const size = Math.random() * 3 + 1;
      
      let detailColor: number;
      switch (biome) {
        case "forest":
          detailColor = Math.random() > 0.5 ? 0x1b3d0c : 0x4a7c59; // 深绿和中绿
          break;
        case "desert":
          detailColor = Math.random() > 0.5 ? 0xd4c5a9 : 0xa0956b; // 浅沙色和深沙色
          break;
        case "tundra":
          detailColor = 0xffffff; // 白色雪点
          break;
        case "swamp":
          detailColor = Math.random() > 0.5 ? 0x2d3d0f : 0x6b7c32; // 深绿和泥色
          break;
        case "plains":
          detailColor = Math.random() > 0.5 ? 0x8bc34a : 0x689f38; // 浅绿和深绿
          break;
        default:
          detailColor = 0x888888;
      }
      
      graphics.circle(x, y, size);
      graphics.fill(detailColor);
    }
  }

  clear(): void {
    for (const graphics of this.renderedChunks.values()) {
      graphics.destroy();
    }
    this.renderedChunks.clear();
    this.terrainContainer.removeChildren();
  }

  destroy(): void {
    this.clear();
    this.stage.removeChild(this.terrainContainer);
    this.terrainContainer.destroy();
  }
}