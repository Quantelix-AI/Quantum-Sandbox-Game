import { AIManager } from "@/ai/AIManager";
import { DialogueResponse } from "@/types";
import { NPC } from "@/entities/NPC";

export interface DialogueSession {
  npc: NPC;
  history: DialogueResponse[];
}

export class DialogSystem {
  private session: DialogueSession | null = null;

  constructor(private readonly ai: AIManager) {}

  async open(npc: NPC, playerMessage: string): Promise<DialogueResponse> {
    const response = await this.ai.requestDialogue(npc, playerMessage);
    if (!this.session || this.session.npc.id !== npc.id) {
      this.session = { npc, history: [] };
    }
    this.session.history.push(response);
    return response;
  }

  getHistory(): DialogueResponse[] {
    return this.session?.history ?? [];
  }

  close(): void {
    this.session = null;
  }
}
