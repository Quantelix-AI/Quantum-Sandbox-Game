import Matter, { Body, Engine, IEventCollision } from "matter-js";
import { EventBus } from "@/core/EventBus";

export class CollisionManager {
  private readonly unsubscribe: Array<() => void> = [];

  constructor(private readonly engine: Engine, private readonly eventBus: EventBus) {}

  initialize(): void {
    const collisionStart = (event: IEventCollision<Matter.Engine>) => {
      event.pairs.forEach((pair) => {
        this.eventBus.emit("collision:start", {
          a: pair.bodyA as Body,
          b: pair.bodyB as Body,
        });
      });
    };

    const collisionEnd = (event: IEventCollision<Matter.Engine>) => {
      event.pairs.forEach((pair) => {
        this.eventBus.emit("collision:end", {
          a: pair.bodyA as Body,
          b: pair.bodyB as Body,
        });
      });
    };

    Matter.Events.on(this.engine, "collisionStart", collisionStart);
    Matter.Events.on(this.engine, "collisionEnd", collisionEnd);

    this.unsubscribe.push(() => Matter.Events.off(this.engine, "collisionStart", collisionStart));
    this.unsubscribe.push(() => Matter.Events.off(this.engine, "collisionEnd", collisionEnd));
  }

  destroy(): void {
    this.unsubscribe.forEach((fn) => fn());
    this.unsubscribe.length = 0;
  }
}
