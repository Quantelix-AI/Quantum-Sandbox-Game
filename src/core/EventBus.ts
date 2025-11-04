export type EventPayload = Record<string, unknown> | void;
export type EventListener<T = EventPayload> = (payload: T) => void;

export class EventBus {
  private listeners: Map<string, Set<EventListener>> = new Map();

  on<T = EventPayload>(event: string, listener: EventListener<T>): () => void {
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(listener as EventListener);
    this.listeners.set(event, listeners);

    return () => this.off(event, listener as EventListener);
  }

  once<T = EventPayload>(event: string, listener: EventListener<T>): () => void {
    const wrapper: EventListener<T> = (payload) => {
      this.off(event, wrapper as EventListener);
      listener(payload);
    };

    return this.on(event, wrapper);
  }

  off<T = EventPayload>(event: string, listener: EventListener<T>): void {
    const listeners = this.listeners.get(event);
    if (!listeners) return;

    listeners.delete(listener as EventListener);
    if (listeners.size === 0) {
      this.listeners.delete(event);
    }
  }

  emit<T = EventPayload>(event: string, payload: T extends void ? undefined : T): void {
    const listeners = this.listeners.get(event);
    if (!listeners) return;

    listeners.forEach((listener) => {
      try {
        listener(payload as EventPayload);
      } catch (error) {
        console.error(`[EventBus] Listener for "${event}" threw`, error);
      }
    });
  }

  clear(): void {
    this.listeners.clear();
  }
}
