import { EventBus } from "@/core/EventBus";
import { GameSystem } from "@/core/SystemManager";
import { EntityManager } from "@/entities/EntityManager";
import { NPC, DialogueProvider, BehaviorProvider } from "@/entities/NPC";
import { Vector2, NPCBehaviorDecision, DialogueResponse } from "@/types";
import { WorldManager } from "@/world/WorldManager";
import { BehaviorTree, BehaviorContext } from "./BehaviorTree";
import { DeepSeekController, DeepSeekConfig } from "./DeepSeekController";
import { DialogueContext, KimiConfig, KimiController } from "./KimiController";

interface NPCState {
  npc: NPC;
  decisionCooldown: number;
  hunger: number;
  health: number;
  fatigue: number;
}

export interface AIManagerOptions {
  maxCallsPerHour: number;
  deepSeek: DeepSeekConfig;
  kimi: KimiConfig;
}

export class AIManager implements GameSystem {
  public readonly name = "ai";
  public readonly priority = 50;

  private readonly tree = new BehaviorTree();
  private readonly deepSeek: DeepSeekController;
  private readonly kimi: KimiController;

  private readonly npcStates = new Map<string, NPCState>();
  private aiCallBudget: number;
  private budgetTimer = 0;

  constructor(
    private readonly world: WorldManager,
    private readonly entities: EntityManager,
    private readonly eventBus: EventBus,
    private readonly options: AIManagerOptions,
  ) {
    this.deepSeek = new DeepSeekController(options.deepSeek);
    this.kimi = new KimiController(options.kimi);
    this.aiCallBudget = options.maxCallsPerHour;
  }

  initialize(): void {
    this.eventBus.on("entity:added", ({ entity }) => {
      if (entity instanceof NPC) {
        this.registerNPC(entity);
      }
    });
  }

  update(delta: number): void {
    this.budgetTimer += delta;
    if (this.budgetTimer >= 60 * 60 * 1000) {
      this.aiCallBudget = this.options.maxCallsPerHour;
      this.budgetTimer = 0;
    }

    for (const state of this.npcStates.values()) {
      state.decisionCooldown -= delta / 1000;
      if (state.decisionCooldown <= 0) {
        this.evaluateBehavior(state).catch((error) => {
          console.error("[AIManager] Failed to evaluate behavior", error);
        });
        state.decisionCooldown = 8 + Math.random() * 4;
      }
    }
  }

  async requestDialogue(npc: NPC, playerMessage: string): Promise<DialogueResponse> {
    const state = this.npcStates.get(npc.id);
    const fallback: DialogueResponse = {
      speaker: npc.name,
      text: "你好，旅行者。",
      emotion: "neutral",
    };

    const context: DialogueContext = {
      npcName: npc.name,
      profession: "镇民",
      personality: "温和，乐于助人",
      backstory: "村庄的老居民，对附近环境非常熟悉。",
      playerMessage,
      affection: state ? 60 : 50,
      mood: "calm",
    };

    if (!this.kimi.isEnabled() || this.aiCallBudget <= 0) {
      return fallback;
    }

    const response = await this.kimi.generateDialogue(context);
    this.aiCallBudget -= 1;
    return response;
  }

  getRemainingBudget(): number {
    return this.aiCallBudget;
  }

  private registerNPC(npc: NPC): void {
    const state: NPCState = {
      npc,
      decisionCooldown: 2,
      hunger: 30 + Math.random() * 20,
      health: 70 + Math.random() * 30,
      fatigue: 20 + Math.random() * 30,
    };
    this.npcStates.set(npc.id, state);

    const dialogueProvider: DialogueProvider = (entity) => this.requestDialogue(entity, "你好");
    npc.setDialogueProvider(dialogueProvider);

    const behaviorProvider: BehaviorProvider = (entity) => this.evaluateBehavior(this.npcStates.get(entity.id)!);
    npc.setBehaviorProvider(behaviorProvider);
  }

  private async evaluateBehavior(state: NPCState): Promise<NPCBehaviorDecision> {
    const player = this.entities.getPlayer();
    const playerPos = player.getBody().position as Vector2;
    const npcPos = state.npc.getBody().position as Vector2;
    const distance = Math.hypot(playerPos.x - npcPos.x, playerPos.y - npcPos.y);

    const worldState = this.world.getState();
    const context: BehaviorContext = {
      npcId: state.npc.id,
      hunger: state.hunger,
      health: state.health,
      fatigue: state.fatigue,
      worldTime: worldState.timeOfDay,
      distanceToPlayer: distance,
      weather: worldState.weather,
    };

    const fallback = () => this.tree.evaluate(context);

    if (!this.deepSeek.isEnabled() || this.aiCallBudget <= 0) {
      const decision = fallback();
      this.eventBus.emit("npc:behavior", { npc: state.npc, decision });
      return decision;
    }

    const decision = await this.deepSeek.decideBehavior(context, fallback);
    this.aiCallBudget -= 1;
    this.eventBus.emit("npc:behavior", { npc: state.npc, decision });
    return decision;
  }
}
