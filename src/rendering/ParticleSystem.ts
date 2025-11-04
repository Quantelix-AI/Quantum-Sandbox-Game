import { Container, Graphics } from "pixi.js";
import { Vector2 } from "@/types";

interface Particle {
  sprite: Graphics;
  velocity: Vector2;
  lifetime: number;
}

export class ParticleSystem {
  private readonly particles: Particle[] = [];

  constructor(private readonly container: Container) {}

  emit(position: Vector2, color = 0xffffff, count = 8): void {
    for (let i = 0; i < count; i += 1) {
      const sprite = new Graphics();
      sprite.beginFill(color, 0.8);
      sprite.drawCircle(0, 0, 3);
      sprite.endFill();
      sprite.position.set(position.x, position.y);

      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 1;
      const velocity: Vector2 = {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
      };

      this.container.addChild(sprite);
      this.particles.push({ sprite, velocity, lifetime: 0.8 + Math.random() * 0.6 });
    }
  }

  update(delta: number): void {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const particle = this.particles[i];
      particle.lifetime -= delta / 1000;
      if (particle.lifetime <= 0) {
        particle.sprite.destroy();
        this.particles.splice(i, 1);
        continue;
      }
      particle.sprite.position.x += particle.velocity.x;
      particle.sprite.position.y += particle.velocity.y;
      particle.sprite.alpha = particle.lifetime;
    }
  }
}
