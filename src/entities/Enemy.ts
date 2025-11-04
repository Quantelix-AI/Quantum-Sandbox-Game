import { Body, Bodies } from "matter-js";
import { Container, Graphics } from "pixi.js";
import { EntityType } from "@/types";
import { BaseEntity } from "./BaseEntity";

export class Enemy extends BaseEntity {
  public readonly type: EntityType = "enemy";

  private readonly graphics: Graphics;
  private readonly patrolRadius = 120;
  private readonly speed = 2.5;
  private readonly origin = { ...this.position };
  private patrolAngle = 0;

  constructor(x: number, y: number, public readonly monsterName: string) {
    super(x, y);

    this.graphics = new Graphics();
    this.sprite = new Container();
    this.sprite.zIndex = 11; // Enemy在基础实体之上，但在NPC和玩家之下
    this.sprite.addChild(this.graphics);
    this.render();
  }

  createPhysicsBody(): Body {
    const body = Bodies.circle(this.position.x, this.position.y, 25, {
      friction: 0.05,
      restitution: 0.2,
      label: "enemy",
    });
    return body;
  }

  update(delta: number): void {
    this.patrolAngle += (delta / 1000) * 0.5;
    const targetX = this.origin.x + Math.cos(this.patrolAngle) * this.patrolRadius;
    const targetY = this.origin.y + Math.sin(this.patrolAngle) * this.patrolRadius;
    const body = this.getBody();
    const deltaX = targetX - body.position.x;
    const deltaY = targetY - body.position.y;
    const distance = Math.hypot(deltaX, deltaY) || 1;
    Body.setVelocity(body, {
      x: (deltaX / distance) * this.speed,
      y: (deltaY / distance) * this.speed,
    });
    this.syncGraphics();
  }

  private render(): void {
    console.log(`[Enemy] 开始渲染敌人: ${this.monsterName}`);
    this.graphics.clear();
    
    // 使用 PIXI.js v8 的正确 API
    // 绘制黑色边框圆形
    this.graphics.circle(0, 0, 37).fill(0x000000);
    // 绘制红色主体圆形
    this.graphics.circle(0, 0, 35).fill(0xe74c3c);
    
    console.log(`[Enemy] 敌人渲染完成: ${this.monsterName}，颜色: 红色 (0xe74c3c)，半径: 35，带黑色边框`);
  }
}
