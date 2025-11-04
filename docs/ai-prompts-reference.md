# 🤖 AI Prompts Library - Quick Reference

> **中文版**: [AI提示词库-快速参考](../files/AI提示词库-快速参考.md)

## 🎯 AI-Driven Game Development Prompt Library

This document provides AI prompt templates for various game development scenarios, helping you quickly integrate AI functionality into your game.

---

## 🧠 NPC Behavior Generation

### 1.1 Basic Dialogue Generation

**Prompt Template:**
```
You are a game NPC named [NAME], role: [ROLE], personality: [PERSONALITY], current emotional state: [EMOTION].

Background setting:
- World type: [WORLD_TYPE]
- Current location: [LOCATION]
- Time period: [TIME]
- Current situation: [SITUATION]

Player's last action: [PLAYER_ACTION]

Please generate a natural dialogue response (1-2 sentences), maintaining the NPC's personality and background setting. The response should be in Chinese, with a friendly tone.
```

**Example:**
```
You are a game NPC named "老约翰", role: village elder, personality: wise and kind, current emotional state: worried.

Background setting:
- World type: medieval fantasy
- Current location: small village
- Time period: evening
- Current situation: village is threatened by monsters

Player's last action: asked about recent strange occurrences

Please generate a natural dialogue response (1-2 sentences), maintaining the NPC's personality and background setting. The response should be in Chinese, with a friendly tone.
```

**Expected Output:**
```
"年轻人，最近森林里确实不太平。每到深夜，我都能听到奇怪的嚎叫声从深处传来..."
```

### 1.2 Dynamic Quest Generation

**Prompt Template:**
```
Generate a simple game quest based on the following parameters:

Quest type: [TYPE] (main/side/daily)
Difficulty level: [DIFFICULTY] (1-10)
Player level: [LEVEL]
Quest location: [LOCATION]
NPC information: [NPC_INFO]
World background: [WORLD_BACKGROUND]

Requirements:
1. Include quest title, description, objectives, and rewards
2. Ensure the quest fits the world setting
3. Difficulty should be appropriate for player level
4. Rewards should be balanced
5. Provide clear completion conditions

Format as JSON structure.
```

**Example Output:**
```json
{
  "title": "森林中的威胁",
  "description": "村里的长老老约翰请求你调查最近森林里传来的奇怪声音。村民们都很担心，希望你能找出真相。",
  "objectives": [
    "前往森林深处调查奇怪声音的来源",
    "击败3只被腐化的森林狼",
    "向老约翰汇报调查结果"
  ],
  "rewards": {
    "experience": 150,
    "gold": 50,
    "items": ["生命药水 x3", "铁剑 x1"]
  },
  "difficulty": 3,
  "timeLimit": "无时间限制"
}
```

---

## 🌍 World Event Generation

### 2.1 Random World Events

**Prompt Template:**
```
Generate a random world event based on:

Event type: [TYPE] (natural/social/magical/technological)
Severity level: [SEVERITY] (1-10)
Affected area: [AREA]
Player influence: [INFLUENCE]
Current season: [SEASON]
World state: [WORLD_STATE]

Requirements:
1. Include event name, description, impact, and duration
2. Consider the impact on players and NPCs
3. Provide possible player response options
4. Ensure the event fits the world logic
5. Be creative but reasonable

Format as JSON structure.
```

**Example Output:**
```json
{
  "name": "流星雨奇观",
  "description": "夜空中出现了罕见的流星雨，照亮了整个大地。传说中，流星雨会带来神秘的能量和机遇。",
  "severity": 2,
  "impact": {
    "player": {
      "positive": ["魔法技能经验值+20%", "发现稀有材料概率+15%"],
      "negative": ["夜间视野-10%", "怪物活跃度+5%"]
    },
    "world": {
      "npcs": ["村民们都出来观看流星雨，商店营业时间延长"],
      "environment": ["某些植物在流星雨期间会发光"]
    }
  },
  "duration": "3天",
  "playerOptions": [
    "观看流星雨获得魔法灵感",
    "收集流星碎片",
    "在流星雨下许愿",
    "利用流星雨的能量强化装备"
  ]
}
```

### 2.2 Seasonal Changes

**Prompt Template:**
```
Describe the seasonal changes in the game world:

Current season: [SEASON]
Transition type: [TRANSITION] (gradual/sudden)
Player location: [LOCATION]
World type: [WORLD_TYPE]
Seasonal features: [FEATURES]

Requirements:
1. Describe environmental changes
2. Impact on gameplay mechanics
3. NPC behavior changes
4. Available resources and activities
5. Visual and audio effects

Provide detailed descriptions in Chinese.
```

---

## ⚔️ Boss Battle AI Prompts

### 3.1 Boss Behavior Patterns

**Prompt Template:**
```
Design a boss battle behavior pattern for:

Boss name: [NAME]
Boss type: [TYPE] (melee/magic/ranged/hybrid)
Difficulty level: [DIFFICULTY] (1-10)
Battle phase: [PHASE] (1-3)
Player level: [PLAYER_LEVEL]
Battle environment: [ENVIRONMENT]

Requirements:
1. Include 3-5 attack patterns
2. Define trigger conditions for each pattern
3. Provide visual and audio cues
4. Consider player counter strategies
5. Include phase transition conditions

Format as structured data.
```

**Example Output:**
```json
{
  "bossName": "暗影巫师",
  "difficulty": 7,
  "phases": [
    {
      "phase": 1,
      "healthThreshold": "100%-70%",
      "patterns": [
        {
          "name": "暗影箭雨",
          "description": "发射多枚暗影箭矢",
          "trigger": "玩家距离>5米",
          "cooldown": "3秒",
          "damage": "中等",
          "visualCue": "法杖发光，紫色能量聚集"
        },
        {
          "name": "传送突袭",
          "description": "传送到玩家身后进行近战攻击",
          "trigger": "玩家距离<3米",
          "cooldown": "5秒",
          "damage": "高",
          "counter": "观察传送特效，及时闪避"
        }
      ]
    }
  ]
}
```

### 3.2 Dynamic Difficulty Adjustment

**Prompt Template:**
```
Analyze the current boss battle state and adjust difficulty:

Player performance: [PERFORMANCE] (winning/losing/balanced)
Battle duration: [DURATION]
Player health: [PLAYER_HEALTH]
Boss health: [BOSS_HEALTH]
Player skill level: [SKILL_LEVEL]
Previous attempts: [ATTEMPTS]

Recommend adjustments:
1. Boss attack frequency
2. Attack damage multiplier
3. Special ability usage
4. Phase transition timing
5. Environmental hazards

Provide specific adjustment values and rationale.
```

---

## 🧩 Debug & Optimization Prompts

### 4.1 Performance Analysis

**Prompt Template:**
```
Analyze the following game performance data:

Frame rate: [FPS]
Memory usage: [MEMORY]
Entity count: [ENTITIES]
Physics calculations: [PHYSICS]
Render calls: [RENDERS]
Network latency: [LATENCY]

Identify potential performance bottlenecks and provide optimization suggestions:
1. Rendering optimization
2. Memory management
3. Physics engine tuning
4. Resource loading strategy
5. Code structure improvements

Provide specific implementation suggestions.
```

### 4.2 Bug Analysis

**Prompt Template:**
```
Analyze the following game bug:

Bug description: [DESCRIPTION]
Error message: [ERROR]
Reproduction steps: [STEPS]
Affected systems: [SYSTEMS]
Player reports: [REPORTS]

Provide:
1. Root cause analysis
2. Potential solutions
3. Priority assessment
4. Test case suggestions
5. Prevention measures

Include code examples where applicable.
```

---

## 🔧 DeepSeek API Parameters

### 5.1 Recommended Parameters

```typescript
const deepseekConfig = {
  model: "deepseek-chat", // or "deepseek-coder" for code generation
  temperature: 0.7, // 0.1-1.0, higher = more creative
  max_tokens: 1000, // Adjust based on response length needed
  top_p: 0.9, // Nucleus sampling parameter
  frequency_penalty: 0.3, // Reduce repetition
  presence_penalty: 0.3, // Encourage topic diversity
  stop: null, // Stop sequences
  stream: false, // Enable streaming for real-time responses
};
```

### 5.2 Use Case Recommendations

| Use Case | Temperature | Max Tokens | Model |
|----------|-------------|------------|--------|
| Dialogue Generation | 0.8-0.9 | 200-500 | deepseek-chat |
| Quest Generation | 0.7-0.8 | 500-1000 | deepseek-chat |
| Code Generation | 0.3-0.5 | 1000+ | deepseek-coder |
| World Events | 0.8-1.0 | 300-800 | deepseek-chat |
| Bug Analysis | 0.4-0.6 | 500-1500 | deepseek-coder |

---

## 🚀 Kimi API Parameters

### 6.1 Recommended Parameters

```typescript
const kimiConfig = {
  model: "moonshot-v1-8k", // or "moonshot-v1-32k" for longer contexts
  temperature: 0.7,
  max_tokens: 1000,
  top_p: 0.9,
  frequency_penalty: 0.2,
  presence_penalty: 0.2,
  safe_mode: "off", // or "strict" for sensitive content
};
```

### 6.2 Special Features

- **Long Context Support**: Up to 32K tokens
- **Multilingual**: Excellent Chinese and English support
- **Creative Writing**: Great for narrative content
- **Code Understanding**: Good for technical documentation

---

## 🛠️ Common Error Handling

### 7.1 API Error Codes

```typescript
const errorHandling = {
  400: "Bad Request - Check API parameters",
  401: "Unauthorized - Check API key",
  429: "Rate Limit - Implement retry logic",
  500: "Server Error - Retry with exponential backoff",
  503: "Service Unavailable - Wait and retry",
};
```

### 7.2 Retry Strategy

```typescript
async function apiCallWithRetry(call, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await call();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // Exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, i) * 1000)
      );
    }
  }
}
```

---

## 📈 Advanced Topics

### 8.1 Context-Aware Dialogue

**Prompt Template:**
```
Generate context-aware dialogue considering:

NPC memory: [MEMORY]
Previous interactions: [INTERACTIONS]
Player reputation: [REPUTATION]
Current quest status: [QUEST_STATUS]
World events: [WORLD_EVENTS]
Time progression: [TIME]

Ensure the dialogue reflects accumulated context and maintains consistency.
```

### 8.2 Procedural Content Generation

**Prompt Template:**
```
Generate procedural content for:

Content type: [TYPE] (dungeon/quest/item/character)
Generation seed: [SEED]
Complexity level: [COMPLEXITY]
Theme constraints: [THEME]
Balance requirements: [BALANCE]

Provide structured output that ensures replayability and balance.
```

---

## 🔗 Integration Examples

### 9.1 Basic NPC Dialogue Integration

```typescript
class NPC {
  async generateDialogue(playerInput: string) {
    const prompt = `You are ${this.name}, a ${this.personality} ${this.role}...`;
    
    const response = await deepseekAPI.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 200,
    });
    
    return response.choices[0].message.content;
  }
}
```

### 9.2 Dynamic Quest Generation

```typescript
class QuestGenerator {
  async generateQuest(playerLevel: number) {
    const prompt = `Generate a level ${playerLevel} quest...`;
    
    const response = await kimiAPI.chat.completions.create({
      model: "moonshot-v1-8k",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 800,
    });
    
    return JSON.parse(response.choices[0].message.content);
  }
}
```

---

## 📚 Best Practices Summary

### 10.1 Prompt Design Principles

1. **Clear Context**: Provide sufficient background information
2. **Specific Requirements**: Clearly define output format and constraints
3. **Appropriate Creativity**: Balance between creativity and control using temperature
4. **Error Handling**: Implement robust error handling and retry mechanisms
5. **Performance Optimization**: Cache frequently used content, batch API calls

### 10.2 Common Patterns

- Use structured JSON for complex outputs
- Implement conversation history for context-aware responses
- Validate AI-generated content before use
- Monitor API usage and costs
- Test with various parameter combinations

---

## 🔗 Quick Links

- **Quantelix AI**: [https://quantelixai.com/](https://quantelixai.com/) - Advanced AI solutions for game development
- **Nebulix AI**: [https://nebulix.quantelixai.com](https://nebulix.quantelixai.com) - Next-generation AI game development platform

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Compatibility**: DeepSeek API, Kimi API, OpenAI API  

*Happy AI-powered game development! 🎮🤖*