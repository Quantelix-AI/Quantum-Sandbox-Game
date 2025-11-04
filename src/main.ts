import { GameEngine } from "@/core/GameEngine";

console.log("[main.ts] 脚本开始执行");

const bootstrap = async () => {
  console.log("[main.ts] bootstrap 函数开始执行");
  const container = document.getElementById("game-container");
  if (!container) {
    throw new Error("Missing #game-container element");
  }

  const engine = new GameEngine({
    container,
    seed: Number(import.meta.env.GAME_WORLD_SEED ?? Date.now()),
    maxAiCallsPerHour: Number(import.meta.env.MAX_AI_CALLS_PER_HOUR ?? 1000),
    deepSeekApiKey: import.meta.env.DEEPSEEK_API_KEY,
    deepSeekBaseUrl: import.meta.env.DEEPSEEK_BASE_URL,
    kimiApiKey: import.meta.env.KIMI_API_KEY,
    kimiBaseUrl: import.meta.env.KIMI_BASE_URL,
    debug: import.meta.env.ENABLE_DEBUG_MODE === "true",
  });

  console.log("[main.ts] 开始初始化游戏引擎...");
  await engine.initialize();
  console.log("[main.ts] 游戏引擎初始化完成，开始启动...");
  engine.start();
  console.log("[main.ts] 游戏引擎启动完成！");

  const entities = engine.getEntityManager();
  const ui = engine.getUIManager();

  if (typeof window !== "undefined") {
    window.addEventListener("keydown", async (event) => {
      if (event.key === "Escape") {
        ui.hideDialogue();
        return;
      }

      if (event.key.toLowerCase() !== "e") return;
      const npc = entities.findNearestNPC(120);
      if (!npc) return;

      const response = await ui.getDialogSystem().open(npc, "你好");
      await ui.showDialogue(response);
    });
  }
};

bootstrap().catch((error) => {
  console.error("Failed to bootstrap game", error);
});
