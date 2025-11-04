import { EventBus } from "@/core/EventBus";
import { GameSystem } from "@/core/SystemManager";
import { WorldManager } from "@/world/WorldManager";
import { BaseEntity } from "./BaseEntity";
import { Player } from "./Player";
import { NPC } from "./NPC";
import { Enemy } from "./Enemy";
import { PhysicsEngine } from "@/physics/PhysicsEngine";
import { RenderingSystem } from "@/rendering/RenderingSystem";

export class EntityManager implements GameSystem {
  public readonly name = "entities";
  public readonly priority = 70;

  private entities = new Map<string, BaseEntity>();
  private player!: Player;

  constructor(
    private readonly physics: PhysicsEngine,
    private readonly rendering: RenderingSystem,
    private readonly world: WorldManager,
    private readonly eventBus: EventBus,
  ) {}

  initialize(): void {
    // Player is created elsewhere and registered via addEntity.
  }

  update(delta: number): void {
    for (const entity of this.entities.values()) {
      entity.update(delta);
    }

    if (this.player) {
      this.world.focusPosition(this.player.getBody().position);
    }
  }

  addEntity(entity: BaseEntity): void {
    console.log(`[EntityManager] 开始添加实体: ${entity.id}, 类型: ${entity.type}`);
    
    entity.setBody(entity.createPhysicsBody());
    console.log(`[EntityManager] 物理体已创建并设置`);
    
    this.physics.addBody(entity.getBody());
    console.log(`[EntityManager] 物理体已添加到物理引擎`);
    
    const sprite = entity.getSprite();
    console.log(`[EntityManager] 获取精灵，zIndex: ${sprite.zIndex}, 子元素数量: ${sprite.children.length}`);
    
    this.rendering.getStage().addChild(sprite);
    console.log(`[EntityManager] 精灵已添加到舞台，舞台子元素数量: ${this.rendering.getStage().children.length}`);
    
    this.entities.set(entity.id, entity);
    console.log(`[EntityManager] 实体已添加到实体映射，总实体数: ${this.entities.size}`);

    if (entity instanceof Player) {
      this.player = entity;
      console.log(`[EntityManager] 玩家实体已设置`);
    }

    this.eventBus.emit("entity:added", { entity });
    console.log(`[EntityManager] 实体添加完成: ${entity.id}`);
  }

  removeEntity(entityId: string): void {
    const entity = this.entities.get(entityId);
    if (!entity) return;

    this.physics.removeBody(entity.getBody());
    this.rendering.getStage().removeChild(entity.getSprite());
    this.entities.delete(entityId);
    this.eventBus.emit("entity:removed", { entityId });
  }

  getPlayer(): Player {
    return this.player;
  }

  listEntities(): BaseEntity[] {
    return [...this.entities.values()];
  }

  getNPCs(): NPC[] {
    return this.listEntities().filter((entity): entity is NPC => entity instanceof NPC);
  }

  findNearestNPC(maxDistance: number): NPC | null {
    if (!this.player) return null;
    const playerPos = this.player.getBody().position;
    let nearest: NPC | null = null;
    let bestDistance = maxDistance;

    for (const entity of this.entities.values()) {
      if (!(entity instanceof NPC)) continue;
      const { x, y } = entity.getBody().position;
      const distance = Math.hypot(playerPos.x - x, playerPos.y - y);
      if (distance < bestDistance) {
        bestDistance = distance;
        nearest = entity;
      }
    }

    return nearest;
  }

  spawnDefaultNPCs(): void {
    const npc = new NPC(600, 500, "村民老张");
    this.addEntity(npc);

    const enemy = new Enemy(800, 450, "荒野巨蜥");
    this.addEntity(enemy);
  }
}
