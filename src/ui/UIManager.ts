import { AIManager } from "@/ai/AIManager";
import { EventBus } from "@/core/EventBus";
import { GameSystem } from "@/core/SystemManager";
import { DialogueResponse, WorldState } from "@/types";
import { DialogSystem } from "./DialogSystem";
import { Inventory } from "./Inventory";

interface UIElements {
  root: HTMLElement;
  hud: HTMLElement;
  dialogue: HTMLElement;
  log: HTMLElement;
}

export class UIManager implements GameSystem {
  public readonly name = "ui";
  public readonly priority = 10;

  private readonly inventory = new Inventory();
  private readonly dialogSystem: DialogSystem;
  private elements: UIElements | null = null;
  private worldState: WorldState | null = null;

  constructor(private readonly ai: AIManager, private readonly eventBus: EventBus) {
    this.dialogSystem = new DialogSystem(ai);
  }

  initialize(): void {
    if (typeof document === "undefined") return;

    const root = document.createElement("div");
    root.id = "ui-layer";
    root.style.position = "fixed";
    root.style.top = "0";
    root.style.left = "0";
    root.style.width = "100%";
    root.style.pointerEvents = "none";
    root.style.color = "#ffffff";
    root.style.fontFamily = '"Segoe UI", "Microsoft YaHei", sans-serif';

    const hud = document.createElement("div");
    hud.style.padding = "12px";
    hud.style.display = "flex";
    hud.style.justifyContent = "space-between";

    const dialogue = document.createElement("div");
    dialogue.style.position = "absolute";
    dialogue.style.bottom = "32px";
    dialogue.style.left = "50%";
    dialogue.style.transform = "translateX(-50%)";
    dialogue.style.minWidth = "320px";
    dialogue.style.maxWidth = "480px";
    dialogue.style.background = "rgba(0,0,0,0.65)";
    dialogue.style.borderRadius = "8px";
    dialogue.style.padding = "16px";
    dialogue.style.fontSize = "14px";
    dialogue.style.pointerEvents = "auto";
    dialogue.style.display = "none";

    const log = document.createElement("div");
    log.style.position = "absolute";
    log.style.top = "80px";
    log.style.right = "32px";
    log.style.width = "260px";
    log.style.background = "rgba(10,10,10,0.6)";
    log.style.borderRadius = "8px";
    log.style.padding = "12px";
    log.style.fontSize = "12px";
    log.style.maxHeight = "240px";
    log.style.overflowY = "auto";

    root.append(hud, dialogue, log);
    document.body.appendChild(root);

    this.elements = { root, hud, dialogue, log };

    this.eventBus.on<WorldState>("world:state", (state) => {
      this.worldState = state;
      this.renderHUD();
    });

    this.eventBus.on("npc:behavior", ({ npc, decision }) => {
      this.appendLog(`${npc.name} -> ${decision.action} (${decision.reasoning})`);
    });
  }

  update(): void {}

  async showDialogue(response: DialogueResponse): Promise<void> {
    if (!this.elements) return;
    const { dialogue } = this.elements;
    dialogue.innerHTML = `<strong>${response.speaker}</strong><p style="margin:8px 0 0; line-height:1.4;">${response.text}</p>`;
    dialogue.style.display = "block";
  }

  hideDialogue(): void {
    if (!this.elements) return;
    this.elements.dialogue.style.display = "none";
  }

  getDialogSystem(): DialogSystem {
    return this.dialogSystem;
  }

  destroy(): void {
    if (this.elements) {
      this.elements.root.remove();
      this.elements = null;
    }
  }

  private renderHUD(): void {
    if (!this.elements || !this.worldState) return;
    const { hud } = this.elements;
    const { timeOfDay, weather, dayCount } = this.worldState;
    hud.innerHTML = `
      <div>第 ${dayCount + 1} 天 | 时间 ${timeOfDay.toFixed(2)} | 天气 ${weather.type}</div>
      <div>AI 调用剩余：${this.aiRemaining()}</div>
    `;
  }

  private appendLog(message: string): void {
    if (!this.elements) return;
    const entry = document.createElement("div");
    entry.textContent = message;
    entry.style.marginBottom = "4px";
    this.elements.log.prepend(entry);
    while (this.elements.log.childElementCount > 10) {
      this.elements.log.removeChild(this.elements.log.lastChild!);
    }
  }

  private aiRemaining(): number {
    return Math.max(0, this.ai.getRemainingBudget());
  }
}
