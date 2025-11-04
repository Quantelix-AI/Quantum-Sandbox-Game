export interface GameSystem {
  name: string;
  priority: number;
  initialize(): Promise<void> | void;
  update(delta: number): void;
  postUpdate?(delta: number): void;
  destroy?(): void;
}

export class SystemManager {
  private systems: GameSystem[] = [];
  private initialized = false;

  register(system: GameSystem): void {
    if (this.systems.find((s) => s.name === system.name)) {
      throw new Error(`System with name ${system.name} already registered`);
    }

    this.systems.push(system);
    this.systems.sort((a, b) => b.priority - a.priority);
  }

  async initializeAll(): Promise<void> {
    for (const system of this.systems) {
      await system.initialize();
    }
    this.initialized = true;
  }

  updateAll(delta: number): void {
    if (!this.initialized) return;

    for (const system of this.systems) {
      system.update(delta);
    }

    for (const system of this.systems) {
      system.postUpdate?.(delta);
    }
  }

  destroyAll(): void {
    for (const system of this.systems) {
      try {
        system.destroy?.();
      } catch (error) {
        console.error(`[SystemManager] Failed to destroy system ${system.name}`, error);
      }
    }
    this.systems = [];
    this.initialized = false;
  }
}
