export class ObjectPool<T> {
  private pool: T[] = [];

  constructor(private readonly factory: () => T, private readonly reset?: (item: T) => void) {}

  acquire(): T {
    if (this.pool.length > 0) {
      const item = this.pool.pop() as T;
      this.reset?.(item);
      return item;
    }
    return this.factory();
  }

  release(item: T): void {
    this.reset?.(item);
    this.pool.push(item);
  }

  clear(): void {
    this.pool = [];
  }
}
