import { Container } from "pixi.js";
import { Vector2 } from "@/types";

export class CameraSystem {
  private target?: Container;
  private viewportWidth = 1280;
  private viewportHeight = 720;
  private smoothing = 0.3; // 增加平滑度从0.1到0.3
  private isFirstUpdate = true; // 添加标志来处理首次更新

  constructor(private readonly stage: Container) {}

  setViewport(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    console.log(`[CameraSystem] 设置视口大小: ${width}x${height}`);
  }

  follow(target: Container): void {
    this.target = target;
    this.isFirstUpdate = true; // 重置首次更新标志
    console.log(`[CameraSystem] 设置跟随目标: ${target ? '存在' : '不存在'}`);
    if (target) {
      console.log(`[CameraSystem] 目标初始位置: (${target.x}, ${target.y})`);
      console.log(`[CameraSystem] 目标position属性: (${target.position?.x}, ${target.position?.y})`);
    }
  }

  setSmoothing(value: number): void {
    this.smoothing = value;
  }

  update(): void {
    if (!this.target) {
      console.log(`[CameraSystem] 没有跟随目标`);
      return;
    }

    const targetX = this.target.x;
    const targetY = this.target.y;
    
    const centerX = this.viewportWidth / 2;
    const centerY = this.viewportHeight / 2;

    // 设置舞台位置，使目标在屏幕中心
    const stageX = centerX - targetX;
    const stageY = centerY - targetY;

    // 首次更新时立即跳转到正确位置，避免平滑跟随的延迟
    if (this.isFirstUpdate) {
      this.stage.position.set(stageX, stageY);
      this.isFirstUpdate = false;
      console.log(`[CameraSystem] 首次更新，立即跳转到: position(${stageX.toFixed(2)}, ${stageY.toFixed(2)})`);
      console.log(`[CameraSystem] 视口大小: ${this.viewportWidth}x${this.viewportHeight}, 中心点: (${centerX}, ${centerY})`);
    } else {
      // 后续更新使用平滑跟随
      this.stage.position.x += (stageX - this.stage.position.x) * this.smoothing;
      this.stage.position.y += (stageY - this.stage.position.y) * this.smoothing;
    }

    // 每60帧输出一次详细信息
    if (Math.random() < 0.016) {
      console.log(`[CameraSystem] 目标位置详情:`);
      console.log(`  - target: (${targetX.toFixed(2)}, ${targetY.toFixed(2)})`);
      console.log(`  - 视口: ${this.viewportWidth}x${this.viewportHeight}, 中心: (${centerX}, ${centerY})`);
      console.log(`  - 目标stage位置: (${stageX.toFixed(2)}, ${stageY.toFixed(2)})`);
      console.log(`  - 当前stage位置: (${this.stage.position.x.toFixed(2)}, ${this.stage.position.y.toFixed(2)})`);
    }
  }

  worldToScreen(world: Vector2): Vector2 {
    return {
      x: world.x - this.stage.pivot.x,
      y: world.y - this.stage.pivot.y,
    };
  }
}
