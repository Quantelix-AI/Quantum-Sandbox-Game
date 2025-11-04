export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
}

export class Inventory {
  private readonly items = new Map<string, InventoryItem>();

  addItem(item: InventoryItem): void {
    const existing = this.items.get(item.id);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      this.items.set(item.id, { ...item });
    }
  }

  removeItem(itemId: string, quantity: number): boolean {
    const existing = this.items.get(itemId);
    if (!existing) return false;
    if (existing.quantity < quantity) return false;
    existing.quantity -= quantity;
    if (existing.quantity === 0) {
      this.items.delete(itemId);
    }
    return true;
  }

  listItems(): InventoryItem[] {
    return [...this.items.values()];
  }

  clear(): void {
    this.items.clear();
  }
}
