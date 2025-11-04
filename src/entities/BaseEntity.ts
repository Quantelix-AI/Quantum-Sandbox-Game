import { Body } from "matter-js";
import { Container } from "pixi.js";
import { EntityType, Vector2 } from "@/types";

let entityIdCounter = 0;

export abstract class BaseEntity {
  public readonly id: string;
  public abstract readonly type: EntityType;

  protected sprite: Container = new Container();
  protected body!: Body;

  protected position: Vector2;

  constructor(x: number, y: number) {
    this.id = `entity_${entityIdCounter += 1}`;
    this.position = { x, y };
    
    // 设置实体的 zIndex，确保在地形之上显示
    this.sprite.zIndex = 10; // 地形的 zIndex 是 -1，所以实体应该是正数
    console.log(`[BaseEntity] 创建实体 ${this.id}，zIndex: ${this.sprite.zIndex}`);
  }

  abstract createPhysicsBody(): Body;

  abstract update(delta: number): void;

  protected syncGraphics(): void {
    this.sprite.position.set(this.body.position.x, this.body.position.y);
  }

  getSprite(): Container {
    return this.sprite;
  }

  getBody(): Body {
    return this.body;
  }

  setBody(body: Body): void {
    this.body = body;
  }
}
