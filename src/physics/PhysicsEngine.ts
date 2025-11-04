import Matter, { Body, Bodies, Composite, Engine, World } from "matter-js";
import { GameSystem } from "@/core/SystemManager";
import { Vector2 } from "@/types";

export class PhysicsEngine implements GameSystem {
  public readonly name = "physics";
  public readonly priority = 100;

  public engine: Engine;
  public world: World;

  private accumulator = 0;
  private readonly fixedDelta = 1000 / 60;

  constructor() {
    this.engine = Engine.create({ enableSleeping: true });
    this.world = this.engine.world;
  }

  initialize(): void {
    this.engine.gravity.y = 1;
  }

  update(delta: number): void {
    this.accumulator += delta;
    while (this.accumulator >= this.fixedDelta) {
      Matter.Engine.update(this.engine, this.fixedDelta);
      this.accumulator -= this.fixedDelta;
    }
  }

  setGravity(gravity: Vector2): void {
    this.engine.gravity.x = gravity.x;
    this.engine.gravity.y = gravity.y;
  }

  addBody(body: Body): void {
    Composite.add(this.engine.world, body);
  }

  removeBody(body: Body): void {
    Composite.remove(this.engine.world, body);
  }

  createStaticRectangle(x: number, y: number, width: number, height: number): Body {
    const rect = Bodies.rectangle(x, y, width, height, { isStatic: true });
    this.addBody(rect);
    return rect;
  }

  destroy(): void {
    Matter.World.clear(this.world, false);
    Matter.Engine.clear(this.engine);
  }
}
