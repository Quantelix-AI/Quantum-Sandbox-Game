import { NPCBehaviorDecision } from "@/types";
import { WeatherState } from "@/world/WeatherSystem";

export interface BehaviorContext {
  npcId: string;
  hunger: number;
  health: number;
  fatigue: number;
  worldTime: number;
  distanceToPlayer: number;
  weather: WeatherState;
}

export class BehaviorTree {
  evaluate(context: BehaviorContext): NPCBehaviorDecision {
    if (context.health < 40) {
      return {
        action: "FLEE",
        target: "safe_zone",
        priority: 10,
        duration: 8,
        reasoning: "生命值过低，优先撤退至安全区域",
      };
    }

    if (context.hunger > 70) {
      return {
        action: "EAT",
        target: "nearest_food",
        priority: 8,
        duration: 6,
        reasoning: "饥饿度过高，需要寻找食物补给",
      };
    }

    if (context.fatigue > 60 && (context.worldTime > 22 || context.worldTime < 6)) {
      return {
        action: "SLEEP",
        target: "home",
        priority: 7,
        duration: 12,
        reasoning: "夜间且疲劳值较高，返回休息",
      };
    }

    if (context.distanceToPlayer < 120 && context.weather.visibility > 0.5) {
      return {
        action: "INTERACT",
        target: "player",
        priority: 6,
        duration: 4,
        reasoning: "玩家接近且环境良好，适合互动交流",
      };
    }

    return {
      action: "MOVE",
      target: "patrol_route",
      priority: 4,
      duration: 5,
      reasoning: "巡逻周边区域，保持环境安全",
    };
  }
}
