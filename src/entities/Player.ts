import { Body, Bodies } from "matter-js";
import { Container, Graphics } from "pixi.js";
import { InputManager } from "@/core/InputManager";
import { EntityType } from "@/types";
import { clamp } from "@/utils/MathUtils";
import { BaseEntity } from "./BaseEntity";

export class Player extends BaseEntity {
  public readonly type: EntityType = "player";

  private readonly graphics: Graphics;
  private readonly baseSpeed = 5;
  private readonly sprintMultiplier = 2;
  private mouseTarget: { x: number; y: number } | null = null;
  private isMovingToTarget = false;

  constructor(x: number, y: number, private readonly input: InputManager) {
    super(x, y);
    console.log(`[Player] 构造函数开始，位置: (${x}, ${y})`);
    
    this.graphics = new Graphics();
    this.sprite = new Container();
    this.sprite.addChild(this.graphics);
    this.sprite.zIndex = 15; // 玩家应该在其他实体之上
    this.render();
    
    console.log(`[Player] 构造函数完成，精灵已创建，zIndex: ${this.sprite.zIndex}`);
  }

  createPhysicsBody(): Body {
    console.log(`[Player] 创建物理体，位置: (${this.position.x}, ${this.position.y})`);
    const body = Bodies.rectangle(this.position.x, this.position.y, 40, 60, {
      friction: 0.05,
      restitution: 0.2,
      label: "player",
    });
    console.log(`[Player] 物理体创建完成`);
    return body;
  }

  update(delta: number): void {
    // 获取输入状态
    const inputState = this.input.getInputState();
    const mouseState = inputState.mouse;
    
    // 处理鼠标目标移动
    const mouseTarget = this.input.getMouseTarget();
    if (mouseTarget && !this.isMovingToTarget) {
      // 将屏幕坐标转换为世界坐标（这里需要考虑摄像机偏移）
      // 暂时使用屏幕坐标，后续可以添加摄像机转换
      this.mouseTarget = { ...mouseTarget };
      this.isMovingToTarget = true;
      console.log(`[Player] 设置鼠标目标位置: (${mouseTarget.x}, ${mouseTarget.y})`);
    }

    let dx = 0;
    let dy = 0;

    // 键盘移动输入
    const keyboardDx = (this.input.isActive("right") ? 1 : 0) - (this.input.isActive("left") ? 1 : 0);
    const keyboardDy = (this.input.isActive("down") ? 1 : 0) - (this.input.isActive("up") ? 1 : 0);

    // 如果有键盘输入，取消鼠标目标移动
    if (keyboardDx !== 0 || keyboardDy !== 0) {
      this.isMovingToTarget = false;
      this.mouseTarget = null;
      this.input.clearMouseTarget();
      dx = keyboardDx;
      dy = keyboardDy;
    } else if (this.isMovingToTarget && this.mouseTarget) {
      // 鼠标目标移动
      const targetX = this.mouseTarget.x;
      const targetY = this.mouseTarget.y;
      const currentX = this.body.position.x;
      const currentY = this.body.position.y;
      
      const distanceX = targetX - currentX;
      const distanceY = targetY - currentY;
      const distance = Math.hypot(distanceX, distanceY);
      
      // 如果接近目标，停止移动
      if (distance < 10) {
        this.isMovingToTarget = false;
        this.mouseTarget = null;
        this.input.clearMouseTarget();
        dx = 0;
        dy = 0;
      } else {
        dx = distanceX / distance;
        dy = distanceY / distance;
      }
    }

    // 计算移动速度（考虑冲刺）
    let currentSpeed = this.baseSpeed;
    if (this.input.isActive("sprint")) {
      currentSpeed *= this.sprintMultiplier;
    }

    // 标准化移动向量
    const length = Math.hypot(dx, dy) || 1;
    const normalizedX = dx / length;
    const normalizedY = dy / length;

    const velocityX = clamp(normalizedX * currentSpeed, -currentSpeed, currentSpeed);
    const velocityY = clamp(normalizedY * currentSpeed, -currentSpeed, currentSpeed);

    Body.setVelocity(this.getBody(), {
      x: velocityX * (delta / 16),
      y: velocityY * (delta / 16),
    });

    // 处理其他输入
    if (this.input.isActive("jump")) {
      // 跳跃逻辑（可以添加跳跃冷却时间）
      console.log("[Player] 跳跃!");
    }

    if (this.input.isActive("action")) {
      console.log("[Player] 执行动作!");
    }

    if (mouseState.rightButton) {
      console.log("[Player] 右键动作!");
    }

    // 处理滚轮缩放（可以传递给摄像机系统）
    if (mouseState.wheelDelta !== 0) {
      console.log(`[Player] 滚轮缩放: ${mouseState.wheelDelta}`);
    }

    // 重置滚轮增量
    this.input.resetWheelDelta();

    this.syncGraphics();

    // 输入状态调试信息（每秒输出一次）
    if (Math.random() < 0.016) { // 约每秒输出一次（假设60FPS）
      const activeKeys = Array.from(inputState.keys.entries())
        .filter(([_, active]) => active)
        .map(([key, _]) => key);
      
      console.log(`[INPUT DEBUG] 输入状态:`);
      console.log(`  - 激活的按键: [${activeKeys.join(', ')}]`);
      console.log(`  - 鼠标位置: (${mouseState.x.toFixed(0)}, ${mouseState.y.toFixed(0)})`);
      console.log(`  - 鼠标按键: 左=${mouseState.leftButton}, 右=${mouseState.rightButton}, 中=${mouseState.middleButton}`);
      console.log(`  - 滚轮增量: ${mouseState.wheelDelta}`);
      console.log(`  - 鼠标目标: ${this.mouseTarget ? `(${this.mouseTarget.x.toFixed(0)}, ${this.mouseTarget.y.toFixed(0)})` : 'null'}`);
      console.log(`  - 移动到目标: ${this.isMovingToTarget}`);
      console.log(`  - 当前速度: ${currentSpeed.toFixed(1)} (基础: ${this.baseSpeed}, 冲刺: ${this.input.isActive("sprint")})`);
      console.log(`  - 玩家位置: (${this.body.position.x.toFixed(1)}, ${this.body.position.y.toFixed(1)})`);
    }
  }

  private render(): void {
    this.graphics.clear();
    
    // 绘制蓝色矩形 (80x100像素)
    this.graphics.rect(-40, -50, 80, 100);
    this.graphics.fill(0x3498db); // 蓝色
    
    // 添加白色边框
    this.graphics.rect(-40, -50, 80, 100);
    this.graphics.stroke({ width: 2, color: 0xffffff }); // 白色边框
    
    console.log(`[Player] 玩家渲染完成，颜色: 蓝色 (0x3498db)，尺寸: 80x100，带白色边框`);
  }
}
