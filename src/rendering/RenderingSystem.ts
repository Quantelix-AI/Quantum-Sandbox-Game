import { Application, Container } from "pixi.js";
import { GameSystem } from "@/core/SystemManager";
import { CameraSystem } from "./CameraSystem";
import { ParticleSystem } from "./ParticleSystem";
import { TerrainRenderer } from "./TerrainRenderer";

export interface RenderingOptions {
  container: HTMLElement;
  width: number;
  height: number;
  background?: number;
}

export class RenderingSystem implements GameSystem {
  public readonly name = "rendering";
  public readonly priority = 100;

  private app!: Application;
  private stage!: Container;
  private camera!: CameraSystem;
  private particles!: ParticleSystem;
  private terrain!: TerrainRenderer;
  private resizeHandler?: () => void;

  constructor(private readonly options: RenderingOptions) {}

  async initialize(): Promise<void> {
    this.app = new Application();
    await this.app.init({
      width: this.options.width,
      height: this.options.height,
      background: this.options.background ?? 0x0a0a0a,
      antialias: true,
    });

    this.stage = this.app.stage;
    this.stage.sortableChildren = true;

    this.camera = new CameraSystem(this.stage);
    console.log(`[RenderingSystem] 初始化视口大小: ${this.options.width}x${this.options.height}`);
    this.camera.setViewport(this.options.width, this.options.height);

    this.particles = new ParticleSystem(this.stage);
    this.terrain = new TerrainRenderer(this.stage);

    this.options.container.appendChild(this.app.canvas);
    // 不设置舞台位置，让相机系统通过pivot来控制视图
    // this.stage.position.set(this.options.width / 2, this.options.height / 2);

    // 注释掉自动调整大小功能，使用固定尺寸
    // this.handleResize();
    // if (typeof window !== "undefined") {
    //   this.resizeHandler = () => this.handleResize();
    //   window.addEventListener("resize", this.resizeHandler);
    // }
  }

  update(delta: number): void {
    this.camera.update(delta);
    this.particles.update(delta);
    
    // 每隔一段时间输出舞台子元素信息
    if (Math.random() < 0.01) { // 1% 概率输出
      console.log(`[RenderingSystem] 舞台子元素数量: ${this.stage.children.length}`);
      this.stage.children.forEach((child, index) => {
        console.log(`  - 子元素 ${index}: ${child.constructor.name}, zIndex: ${child.zIndex}, visible: ${child.visible}, position: (${child.x.toFixed(2)}, ${child.y.toFixed(2)})`);
      });
    }
  }

  getApplication(): Application {
    return this.app;
  }

  getStage(): Container {
    return this.stage;
  }

  getCamera(): CameraSystem {
    return this.camera;
  }

  getParticleSystem(): ParticleSystem {
    return this.particles;
  }

  getTerrainRenderer(): TerrainRenderer {
    return this.terrain;
  }

  destroy(): void {
    this.resizeHandler && window.removeEventListener("resize", this.resizeHandler);
    this.terrain.destroy();
    this.app.destroy(true, { children: true, texture: true, baseTexture: true });
  }

  private handleResize(): void {
    if (typeof window === "undefined") return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    console.log(`[RenderingSystem] 窗口大小变化: ${width}x${height}`);
    this.app.renderer.resize(width, height);
    this.camera.setViewport(width, height);
    this.stage.position.set(width / 2, height / 2);
  }
}
