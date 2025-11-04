import { NPCBehaviorDecision } from "@/types";
import { BehaviorContext } from "./BehaviorTree";

export interface DeepSeekConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export class DeepSeekController {
  private readonly enabled: boolean;
  private readonly endpoint: string;
  private readonly model: string;

  constructor(private readonly config: DeepSeekConfig) {
    this.enabled = Boolean(config.apiKey);
    this.endpoint = `${config.baseUrl ?? "https://api.deepseek.com"}/v1/chat/completions`;
    this.model = config.model ?? "deepseek-chat";
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async decideBehavior(context: BehaviorContext, fallback: () => NPCBehaviorDecision): Promise<NPCBehaviorDecision> {
    if (!this.enabled || typeof fetch === "undefined") {
      return fallback();
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
          temperature: 0.7,
          max_tokens: 300,
          messages: [
            {
              role: "system",
              content: "你是一个2D沙盒生存游戏的NPC行为决策引擎，请只返回JSON格式的数据。",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const message = data.choices?.[0]?.message?.content;
      if (!message) throw new Error("Empty response from DeepSeek");

      const parsed = this.parseResponse(message);
      return parsed ?? fallback();
    } catch (error) {
      console.warn("[DeepSeekController] Falling back to本地行为树:", error);
      return fallback();
    }
  }

  private buildPrompt(context: BehaviorContext): string {
    return `角色信息：\n- NPC ID：${context.npcId}\n- 生命值：${context.health}\n- 饥饿度：${context.hunger}\n- 疲劳度：${context.fatigue}\n\n环境信息：\n- 当前时间：${context.worldTime.toFixed(2)}\n- 天气：${context.weather.type}\n- 天气能见度：${context.weather.visibility}\n- 与玩家距离：${context.distanceToPlayer.toFixed(2)}\n\n请根据以上信息返回一个JSON，包含action、target、priority、duration、reasoning。`;
  }

  private parseResponse(raw: string): NPCBehaviorDecision | null {
    try {
      const jsonStart = raw.indexOf("{");
      const jsonEnd = raw.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) return null;
      const jsonStr = raw.slice(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(jsonStr);
      return {
        action: parsed.action,
        target: parsed.target ?? "",
        priority: Number(parsed.priority ?? 0),
        duration: Number(parsed.duration ?? 0),
        reasoning: parsed.reasoning ?? "",
      };
    } catch (error) {
      console.warn("[DeepSeekController] Failed to parse JSON", error);
      return null;
    }
  }
}
