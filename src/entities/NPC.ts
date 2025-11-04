import { Body, Bodies } from "matter-js";
import { Container, Graphics, Text } from "pixi.js";
import { DialogueResponse, EntityType, NPCBehaviorDecision } from "@/types";
import { BaseEntity } from "./BaseEntity";

export type DialogueProvider = (npc: NPC) => Promise<DialogueResponse>;
export type BehaviorProvider = (npc: NPC) => Promise<NPCBehaviorDecision>;

export class NPC extends BaseEntity {
  public readonly type: EntityType = "npc";

  private readonly graphics: Graphics;
  private readonly label: Text;

  private dialogueProvider?: DialogueProvider;
  private behaviorProvider?: BehaviorProvider;

  constructor(x: number, y: number, public readonly name: string) {
    super(x, y);

    this.graphics = new Graphics();
    this.label = new Text({
      text: name,
      style: {
        fill: 0xffffff,
        fontSize: 12,
        fontFamily: "Microsoft YaHei, sans-serif",
      }
    });

    this.sprite = new Container();
    this.sprite.zIndex = 12; // NPC在基础实体之上，但在玩家之下
    this.sprite.addChild(this.graphics, this.label);
    this.label.position.set(-this.label.width / 2, -50);
    this.render();
  }

  setDialogueProvider(provider: DialogueProvider): void {
    this.dialogueProvider = provider;
  }

  setBehaviorProvider(provider: BehaviorProvider): void {
    this.behaviorProvider = provider;
  }

  async talk(): Promise<DialogueResponse> {
    if (!this.dialogueProvider) {
      return {
        speaker: this.name,
        text: "你好，旅人！",
        emotion: "neutral",
      };
    }
    return this.dialogueProvider(this);
  }

  async think(): Promise<NPCBehaviorDecision | null> {
    if (!this.behaviorProvider) return null;
    return this.behaviorProvider(this);
  }

  createPhysicsBody(): Body {
    const body = Bodies.rectangle(this.position.x, this.position.y, 30, 50, {
      isStatic: true,
      label: "npc",
    });
    return body;
  }

  update(): void {
    this.syncGraphics();
  }

  private render(): void {
    console.log(`[NPC] 开始渲染 NPC: ${this.name}`);
    this.graphics.clear();
    
    // 使用 PIXI.js v8 的正确 API - 链式调用
    // 绘制黑色边框
    this.graphics.roundRect(-32, -42, 64, 84, 8).fill(0x000000);
    // 绘制黄色主体
    this.graphics.roundRect(-30, -40, 60, 80, 6).fill(0xf1c40f);
    
    console.log(`[NPC] NPC 渲染完成: ${this.name}，颜色: 黄色 (0xf1c40f)，尺寸: 60x80，带黑色边框`);
  }
}
