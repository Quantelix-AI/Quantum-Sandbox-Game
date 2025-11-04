import { DialogueResponse } from "@/types";

export interface DialogueContext {
  npcName: string;
  profession: string;
  personality: string;
  backstory: string;
  playerMessage: string;
  affection: number;
  mood: string;
}

export interface KimiConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export class KimiController {
  private readonly enabled: boolean;
  private readonly endpoint: string;
  private readonly model: string;

  constructor(private readonly config: KimiConfig) {
    this.enabled = Boolean(config.apiKey);
    this.endpoint = `${config.baseUrl ?? "https://api.moonshot.cn"}/v1/chat/completions`;
    this.model = config.model ?? "moonshot-v1-8k";
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async generateDialogue(context: DialogueContext): Promise<DialogueResponse> {
    if (!this.enabled || typeof fetch === "undefined") {
      return this.generateFallback(context);
    }

    try {
      const prompt = this.buildPrompt(context);
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.8,
          max_tokens: 200,
          messages: [
            { role: "system", content: "你是一个沙盒游戏中的NPC，请保持角色一致性。" },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const text: string | undefined = data.choices?.[0]?.message?.content;
      if (!text) throw new Error("Empty response from Kimi");

      return {
        speaker: context.npcName,
        text,
        emotion: context.mood,
      };
    } catch (error) {
      console.warn("[KimiController] Falling back to本地对话:", error);
      return this.generateFallback(context);
    }
  }

  private buildPrompt(context: DialogueContext): string {
    return `你是${context.npcName}，一个${context.profession}。\n性格特征：${context.personality}\n背景故事：${context.backstory}\n心情：${context.mood}\n对玩家好感度：${context.affection}\n玩家说：“${context.playerMessage}”。\n回复要求：30-80字，口语化，保持角色一致。`;
  }

  private generateFallback(context: DialogueContext): DialogueResponse {
    const templates = [
      "${npcName}轻声回应：今天的风沙不算大，路上小心。",
      "${npcName}笑了笑：见到你真好，有空坐下来聊聊。",
      "${npcName}皱眉提醒：周围怪物 restless，别走太远。",
    ];
    const tpl = templates[Math.floor(Math.random() * templates.length)];
    const text = tpl.replace("${npcName}", context.npcName);
    return { speaker: context.npcName, text, emotion: context.mood };
  }
}
