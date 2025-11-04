# AI 行为系统

Quantelix AI 游戏引擎的人工智能和行为系统的综合文档。

## 目录
- [AI 架构概述](#ai-架构概述)
- [AI 控制器](#ai-控制器)
- [行为树](#行为树)
- [NPC 决策制定](#npc-决策制定)
- [对话系统](#对话系统)
- [AI 记忆与学习](#ai-记忆与学习)
- [性能优化](#性能优化)
- [与游戏系统的集成](#与游戏系统的集成)
- [配置与调优](#配置与调优)
- [相关文档](#相关文档)

## AI 架构概述

### 核心 AI 组件

AI 系统基于模块化架构构建，具有可插拔的控制器：

```typescript
interface AIConfig {
  enabled: boolean;
  updateInterval: number;
  maxConcurrentRequests: number;
  controllers: ControllerConfig[];
  behaviorTrees: BehaviorTreeConfig[];
  memory: AIMemoryConfig;
  performance: PerformanceConfig;
}

interface AIManager {
  controllers: Map<string, AIController>;
  behaviorTrees: Map<string, BehaviorTree>;
  memory: AIMemory;
  scheduler: AIScheduler;
  
  initialize(config: AIConfig): Promise<void>;
  update(deltaMs: number): void;
  registerNPC(npc: NPC): void;
  requestDialogue(npc: NPC, context: DialogueContext): Promise<DialogueResponse>;
  getBehavior(npcId: string): BehaviorNode;
}
```

### AI 系统集成

AI 系统与多个游戏系统集成：

```typescript
class AIManager {
  private deepseekController: DeepSeekController;
  private kimiController: KimiController;
  private behaviorTrees: Map<string, BehaviorTree> = new Map();
  private npcBehaviors: Map<string, BehaviorState> = new Map();
  private dialogueHistory: Map<string, DialogueSession[]> = new Map();
  private updateQueue: AIUpdateTask[] = [];
  
  constructor(
    private eventBus: EventBus,
    private entityManager: EntityManager,
    private worldManager: WorldManager
  ) {
    this.initializeControllers();
    this.setupEventHandlers();
  }
  
  private initializeControllers(): void {
    this.deepseekController = new DeepSeekController({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com',
      model: 'deepseek-chat',
      maxTokens: 1000,
      temperature: 0.7
    });
    
    this.kimiController = new KimiController({
      apiKey: process.env.KIMI_API_KEY,
      baseURL: 'https://api.moonshot.cn',
      model: 'moonshot-v1-8k',
      maxTokens: 800,
      temperature: 0.6
    });
  }
  
  private setupEventHandlers(): void {
    this.eventBus.on('npc:spawned', (npc) => this.registerNPC(npc));
    this.eventBus.on('player:interacted', (data) => this.handlePlayerInteraction(data));
    this.eventBus.on('world:time-changed', (data) => this.updateGlobalAIContext(data));
  }
}
```

## AI 控制器

### DeepSeek 控制器

高级推理和对话生成：

```typescript
class DeepSeekController implements AIController {
  private apiClient: APIClient;
  private conversationHistory: Map<string, Message[]> = new Map();
  private personalityTemplates: Map<string, PersonalityTemplate> = new Map();
  
  constructor(private config: DeepSeekConfig) {
    this.apiClient = new APIClient(config);
    this.initializePersonalityTemplates();
  }
  
  async generateBehavior(npc: NPC, context: AIContext): Promise<BehaviorResponse> {
    const prompt = this.buildBehaviorPrompt(npc, context);
    
    try {
      const response = await this.apiClient.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'system', content: this.getSystemPrompt() },
          { role: 'user', content: prompt }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      });
      
      return this.parseBehaviorResponse(response.choices[0].message.content);
    } catch (error) {
      console.error('DeepSeek 行为生成失败:', error);
      return this.getFallbackBehavior(npc, context);
    }
  }
  
  async generateDialogue(npc: NPC, playerInput: string, context: DialogueContext): Promise<DialogueResponse> {
    const conversationId = `${npc.id}-${context.playerId}`;
    const history = this.conversationHistory.get(conversationId) || [];
    
    const prompt = this.buildDialoguePrompt(npc, playerInput, context, history);
    
    try {
      const response = await this.apiClient.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'system', content: this.getPersonalityPrompt(npc) },
          ...history.slice(-10), // 保留最近10条消息
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 500
      });
      
      const dialogueContent = response.choices[0].message.content;
      const parsedResponse = this.parseDialogueResponse(dialogueContent);
      
      // 更新对话历史
      history.push({ role: 'user', content: playerInput });
      history.push({ role: 'assistant', content: dialogueContent });
      this.conversationHistory.set(conversationId, history.slice(-20));
      
      return parsedResponse;
    } catch (error) {
      console.error('DeepSeek 对话生成失败:', error);
      return this.getFallbackDialogue(npc, playerInput, context);
    }
  }
  
  private buildBehaviorPrompt(npc: NPC, context: AIContext): string {
    return `
      你是 ${npc.name}，一个具有以下个性特征的 ${npc.profession}：
      ${JSON.stringify(npc.personality, null, 2)}
      
      当前情况：
      - 时间：${context.timeOfDay}
      - 天气：${context.weather}
      - 玩家距离：${context.playerDistance}
      - 最近事件：${context.recentEvents.join(', ')}
      - NPC 状态：${JSON.stringify(npc.getState(), null, 2)}
      
      基于你的个性和当前情况，你应该做什么？
      考虑：移动、对话、战斗姿态、资源收集、社交互动。
      
      用 JSON 对象回复，包含：
      {
        "action": "movement|dialogue|combat|gather|social|idle",
        "target": "player|location|resource|npc|none",
        "intensity": 0.0-1.0,
        "reasoning": "简要解释",
        "specificAction": "详细行动描述"
      }
    `;
  }
  
  private getPersonalityPrompt(npc: NPC): string {
    const template = this.personalityTemplates.get(npc.personality.type) || 
                     this.personalityTemplates.get('default');
    
    return template.buildPrompt(npc);
  }
}
```

### Kimi 控制器

创意对话和故事生成：

```typescript
class KimiController implements AIController {
  private apiClient: APIClient;
  private storyContext: Map<string, StoryContext> = new Map();
  private creativePrompts: Map<string, CreativePrompt> = new Map();
  
  constructor(private config: KimiConfig) {
    this.apiClient = new APIClient(config);
    this.initializeCreativePrompts();
  }
  
  async generateCreativeDialogue(npc: NPC, context: CreativeContext): Promise<CreativeResponse> {
    const storyContext = this.buildStoryContext(npc, context);
    const prompt = this.creativePrompts.get('storytelling').build(npc, storyContext);
    
    try {
      const response = await this.apiClient.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'system', content: this.getCreativeSystemPrompt() },
          { role: 'user', content: prompt }
        ],
        temperature: 0.9,
        max_tokens: 600
      });
      
      return this.parseCreativeResponse(response.choices[0].message.content);
    } catch (error) {
      console.error('Kimi 创意生成失败:', error);
      return this.getCreativeFallback(npc, context);
    }
  }
  
  async generateQuestHook(npc: NPC, player: Player, context: WorldContext): Promise<QuestSuggestion> {
    const prompt = `
      为 ${npc.name} (${npc.profession}) 创建一个引人入胜的任务线索，提供给 ${player.name}。
      
      NPC 背景：${JSON.stringify(npc.background, null, 2)}
      玩家等级：${player.getLevel()}
      世界事件：${JSON.stringify(context.recentEvents, null, 2)}
      当前位置：${context.location}
      
      生成一个引人入胜的任务，要求：
      1. 符合 NPC 的个性和背景
      2. 匹配玩家当前的进度
      3. 连接到当前的世界事件
      4. 包含有意义的选择和后果
      
      包括：任务标题、简要描述、目标和潜在奖励。
    `;
    
    try {
      const response = await this.apiClient.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'system', content: '你是一个 RPG 游戏的创意任务设计师。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 400
      });
      
      return this.parseQuestSuggestion(response.choices[0].message.content);
    } catch (error) {
      console.error('Kimi 任务生成失败:', error);
      return this.getFallbackQuestSuggestion(npc, player);
    }
  }
}
```

## 行为树

### 行为树结构

层次化决策系统：

```typescript
interface BehaviorNode {
  id: string;
  type: NodeType;
  children: BehaviorNode[];
  condition?: Condition;
  action?: Action;
  properties: NodeProperties;
  
  tick(context: BehaviorContext): NodeStatus;
  reset(): void;
}

enum NodeType {
  SELECTOR = 'selector',
  SEQUENCE = 'sequence',
  PARALLEL = 'parallel',
  CONDITION = 'condition',
  ACTION = 'action',
  DECORATOR = 'decorator'
}

enum NodeStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  RUNNING = 'running'
}

class BehaviorTree {
  private root: BehaviorNode;
  private blackboard: Blackboard;
  private runningNodes: Set<string> = new Set();
  
  constructor(rootNode: BehaviorNode, private npcId: string) {
    this.root = rootNode;
    this.blackboard = new Blackboard();
  }
  
  tick(context: BehaviorContext): BehaviorResult {
    const status = this.root.tick(context);
    
    return {
      status,
      actions: this.extractActions(status),
      debugInfo: this.getDebugInfo()
    };
  }
  
  private extractActions(status: NodeStatus): Action[] {
    const actions: Action[] = [];
    
    this.traverseActions(this.root, (node) => {
      if (node.type === NodeType.ACTION && node.action) {
        actions.push(node.action);
      }
    });
    
    return actions;
  }
}

// NPC 行为树示例
class NPCBehaviorTree extends BehaviorTree {
  constructor(npc: NPC) {
    const root = new SelectorNode('root', [
      // 战斗行为
      new SequenceNode('combat', [
        new ConditionNode('enemy_nearby', (ctx) => ctx.hasNearbyEnemy()),
        new ActionNode('attack_enemy', (ctx) => ctx.attackNearestEnemy())
      ]),
      
      // 社交行为
      new SequenceNode('social', [
        new ConditionNode('player_nearby', (ctx) => ctx.hasNearbyPlayer()),
        new ConditionNode('wants_to_talk', (ctx) => ctx.shouldTalkToPlayer()),
        new ActionNode('initiate_dialogue', (ctx) => ctx.initiateDialogue())
      ]),
      
      // 工作行为
      new SequenceNode('work', [
        new ConditionNode('work_time', (ctx) => ctx.isWorkTime()),
        new ActionNode('perform_work', (ctx) => ctx.performWorkAction())
      ]),
      
      // 空闲行为
      new ActionNode('idle', (ctx) => ctx.performIdleAction())
    ]);
    
    super(root, npc.id);
  }
}
```

### 高级行为节点

复杂的行为模式：

```typescript
class DynamicSelectorNode extends BehaviorNode {
  private priorityFunction: (context: BehaviorContext) => BehaviorNode[];
  
  constructor(
    id: string,
    priorityFunction: (context: BehaviorContext) => BehaviorNode[]
  ) {
    super(id, NodeType.SELECTOR);
    this.priorityFunction = priorityFunction;
  }
  
  tick(context: BehaviorContext): NodeStatus {
    const prioritizedChildren = this.priorityFunction(context);
    
    for (const child of prioritizedChildren) {
      const status = child.tick(context);
      if (status !== NodeStatus.FAILURE) {
        return status;
      }
    }
    
    return NodeStatus.FAILURE;
  }
}

class MemoryConditionNode extends BehaviorNode {
  constructor(
    id: string,
    private memoryKey: string,
    private condition: (value: any) => boolean
  ) {
    super(id, NodeType.CONDITION);
  }
  
  tick(context: BehaviorContext): NodeStatus {
    const memory = context.getMemory(this.memoryKey);
    return this.condition(memory) ? NodeStatus.SUCCESS : NodeStatus.FAILURE;
  }
}

class LearningActionNode extends BehaviorNode {
  private successRate: number = 0.5;
  private attempts: number = 0;
  private learningRate: number = 0.1;
  
  constructor(
    id: string,
    private action: Action,
    private successEvaluator: (result: ActionResult) => boolean
  ) {
    super(id, NodeType.ACTION);
  }
  
  tick(context: BehaviorContext): NodeStatus {
    this.attempts++;
    
    // 根据学习调整行动参数
    const adjustedAction = this.adjustActionForLearning();
    
    const result = adjustedAction.execute(context);
    const success = this.successEvaluator(result);
    
    // 更新成功率
    if (success) {
      this.successRate = Math.min(1.0, this.successRate + this.learningRate);
    } else {
      this.successRate = Math.max(0.0, this.successRate - this.learningRate);
    }
    
    return success ? NodeStatus.SUCCESS : NodeStatus.FAILURE;
  }
  
  private adjustActionForLearning(): Action {
    // 根据成功率修改行动参数
    const confidence = this.successRate;
    return this.action.withConfidence(confidence);
  }
}
```

## NPC 决策制定

### NPC 个性系统

丰富的个性驱动行为：

```typescript
interface Personality {
  type: PersonalityType;
  traits: PersonalityTrait[];
  values: ValueSystem;
  preferences: PreferenceSet;
  emotionalState: EmotionalState;
}

enum PersonalityType {
  FRIENDLY = 'friendly',
  AGGRESSIVE = 'aggressive',
  CURIOUS = 'curious',
  CAUTIOUS = 'cautious',
  HELPFUL = 'helpful',
  SELFISH = 'selfish',
  INTELLECTUAL = 'intellectual',
  CREATIVE = 'creative'
}

interface PersonalityTrait {
  name: string;
  value: number; // -1.0 到 1.0
  stability: number; // 抗性变化程度
}

class PersonalityEngine {
  private personalities: Map<string, Personality> = new Map();
  private traitInfluences: Map<string, TraitInfluence[]> = new Map();
  
  constructor(private eventBus: EventBus) {
    this.initializeTraitInfluences();
  }
  
  createPersonality(type: PersonalityType): Personality {
    const baseTraits = this.getBaseTraitsForType(type);
    const values = this.generateValueSystem(type);
    const preferences = this.generatePreferences(type);
    
    return {
      type,
      traits: baseTraits,
      values,
      preferences,
      emotionalState: this.getInitialEmotionalState(type)
    };
  }
  
  evaluateAction(personality: Personality, action: Action, context: DecisionContext): number {
    let score = 0;
    
    // 基于个性特征评估
    for (const trait of personality.traits) {
      const traitScore = this.evaluateTraitRelevance(trait, action, context);
      score += trait.value * traitScore;
    }
    
    // 基于价值观评估
    const valueScore = this.evaluateValueAlignment(personality.values, action, context);
    score += valueScore * 0.3;
    
    // 基于偏好评估
    const preferenceScore = this.evaluatePreferenceAlignment(personality.preferences, action);
    score += preferenceScore * 0.2;
    
    // 考虑情绪状态
    const emotionalModifier = this.getEmotionalModifier(personality.emotionalState, action);
    score *= emotionalModifier;
    
    return Math.max(-1.0, Math.min(1.0, score));
  }
  
  updatePersonality(personality: Personality, experience: Experience): void {
    // 根据经验更新特征
    for (const trait of personality.traits) {
      const influence = this.calculateTraitInfluence(trait, experience);
      trait.value = this.adjustTraitValue(trait.value, influence, trait.stability);
    }
    
    // 更新情绪状态
    personality.emotionalState = this.updateEmotionalState(personality.emotionalState, experience);
    
    // 确保特征在范围内
    this.normalizeTraits(personality.traits);
  }
  
  private evaluateTraitRelevance(trait: PersonalityTrait, action: Action, context: DecisionContext): number {
    const relevanceMatrix = this.getTraitActionRelevanceMatrix();
    const actionType = action.getType();
    
    return relevanceMatrix[trait.name]?.[actionType] || 0;
  }
  
  private evaluateValueAlignment(values: ValueSystem, action: Action, context: DecisionContext): number {
    let alignment = 0;
    const actionValues = action.getValueImplications();
    
    for (const [value, importance] of Object.entries(values)) {
      const actionValueScore = actionValues[value] || 0;
      alignment += importance * actionValueScore;
    }
    
    return alignment / Object.keys(values).length;
  }
}
```

### 动态决策制定

情境感知的决策系统：

```typescript
class DecisionEngine {
  private decisionHistory: Map<string, DecisionRecord[]> = new Map();
  private contextWeights: Map<string, number> = new Map();
  
  constructor(private personalityEngine: PersonalityEngine) {
    this.initializeContextWeights();
  }
  
  async makeDecision(npc: NPC, context: DecisionContext): Promise<Decision> {
    const personality = npc.getPersonality();
    const availableActions = this.getAvailableActions(npc, context);
    
    // 为每个行动评分
    const scoredActions = await Promise.all(
      availableActions.map(async (action) => {
        const score = await this.scoreAction(action, npc, context);
        return { action, score };
      })
    );
    
    // 应用个性偏好
    const personalityBiasedActions = scoredActions.map(({ action, score }) => {
      const personalityScore = this.personalityEngine.evaluateAction(personality, action, context);
      const finalScore = score * 0.6 + personalityScore * 0.4;
      return { action, score: finalScore };
    });
    
    // 选择最佳行动（带一些随机性）
    const selectedAction = this.selectWeightedAction(personalityBiasedActions);
    
    // 记录决策
    this.recordDecision(npc.id, selectedAction, context);
    
    return {
      action: selectedAction,
      reasoning: this.generateReasoning(selectedAction, context),
      confidence: this.calculateConfidence(selectedAction, context),
      alternatives: personalityBiasedActions.slice(0, 3)
    };
  }
  
  private async scoreAction(action: Action, npc: NPC, context: DecisionContext): Promise<number> {
    let score = 0;
    
    // 评估安全性
    const safetyScore = await this.evaluateSafety(action, npc, context);
    score += safetyScore * this.contextWeights.get('safety') || 0.3;
    
    // 评估效用
    const utilityScore = this.evaluateUtility(action, npc, context);
    score += utilityScore * this.contextWeights.get('utility') || 0.4;
    
    // 评估社交影响
    const socialScore = this.evaluateSocialImpact(action, npc, context);
    score += socialScore * this.contextWeights.get('social') || 0.2;
    
    // 评估新颖性
    const noveltyScore = this.evaluateNovelty(action, npc);
    score += noveltyScore * this.contextWeights.get('novelty') || 0.1;
    
    return Math.max(0, Math.min(1, score));
  }
  
  private async evaluateSafety(action: Action, npc: NPC, context: DecisionContext): Promise<number> {
    const potentialThreats = context.getPotentialThreats();
    const actionRisk = action.getRiskLevel();
    const npcHealth = npc.getHealthPercentage();
    
    // 高生命值 = 更高的风险承受度
    const healthModifier = Math.min(1.0, npcHealth * 1.5);
    
    // 计算威胁等级
    const threatLevel = potentialThreats.reduce((max, threat) => 
      Math.max(max, threat.getThreatLevel()), 0
    );
    
    // 安全评分：越高越安全
    const safetyScore = (1 - actionRisk) * (1 - threatLevel) * healthModifier;
    
    return safetyScore;
  }
  
  private evaluateNovelty(action: Action, npc: NPC): number {
    const history = this.decisionHistory.get(npc.id) || [];
    const recentActions = history.slice(-20);
    
    const actionType = action.getType();
    const recentOccurrences = recentActions.filter(
      record => record.action.getType() === actionType
    ).length;
    
    // 不常采取的行动有更高新颖性
    const noveltyScore = 1.0 - (recentOccurrences / 20);
    
    return noveltyScore;
  }
  
  private selectWeightedAction(scoredActions: ScoredAction[]): Action {
    // 使用 softmax 选择进行探索/利用平衡
    const temperature = 0.3; // 越低越倾向于利用
    const probabilities = this.softmax(scoredActions.map(a => a.score), temperature);
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < scoredActions.length; i++) {
      cumulative += probabilities[i];
      if (random <= cumulative) {
        return scoredActions[i].action;
      }
    }
    
    return scoredActions[0].action; // 回退选项
  }
  
  private softmax(scores: number[], temperature: number): number[] {
    const expScores = scores.map(s => Math.exp(s / temperature));
    const sumExp = expScores.reduce((sum, exp) => sum + exp, 0);
    return expScores.map(exp => exp / sumExp);
  }
}
```

## 对话系统

### 动态对话生成

情境感知的对话系统：

```typescript
interface DialogueContext {
  speaker: NPC;
  listener: Player;
  location: Location;
  timeOfDay: string;
  weather: WeatherType;
  recentEvents: GameEvent[];
  relationship: Relationship;
  conversationHistory: ConversationRecord[];
  emotionalState: EmotionalState;
}

interface DialogueGenerator {
  generateGreeting(context: DialogueContext): Promise<DialogueLine>;
  generateResponse(context: DialogueContext, playerInput: string): Promise<DialogueLine>;
  generateQuestDialogue(context: DialogueContext, quest: Quest): Promise<DialogueLine>;
  generateFarewell(context: DialogueContext): Promise<DialogueLine>;
}

class AdvancedDialogueGenerator implements DialogueGenerator {
  private dialogueTemplates: Map<string, DialogueTemplate> = new Map();
  private conversationMemory: Map<string, ConversationMemory> = new Map();
  private personalityModifiers: Map<PersonalityType, DialogueModifier> = new Map();
  
  constructor(
    private deepseekController: DeepSeekController,
    private kimiController: KimiController
  ) {
    this.initializeTemplates();
    this.initializeModifiers();
  }
  
  async generateResponse(context: DialogueContext, playerInput: string): Promise<DialogueLine> {
    // 分析玩家输入
    const playerIntent = await this.analyzePlayerIntent(playerInput, context);
    
    // 使用 AI 生成基础回复
    let aiResponse: DialogueLine;
    
    if (this.shouldUseCreativeAI(context, playerIntent)) {
      aiResponse = await this.kimiController.generateCreativeDialogue(
        context.speaker,
        playerInput,
        this.buildCreativeContext(context, playerIntent)
      );
    } else {
      aiResponse = await this.deepseekController.generateDialogue(
        context.speaker,
        playerInput,
        this.buildStandardContext(context, playerIntent)
      );
    }
    
    // 应用个性修改
    const personality = context.speaker.getPersonality();
    const modifiedResponse = this.applyPersonalityModifications(aiResponse, personality, context);
    
    // 应用情绪状态修改
    const emotionalResponse = this.applyEmotionalModifications(modifiedResponse, context.emotionalState);
    
    // 更新对话记忆
    this.updateConversationMemory(context, playerInput, emotionalResponse);
    
    return emotionalResponse;
  }
  
  private async analyzePlayerIntent(input: string, context: DialogueContext): Promise<PlayerIntent> {
    const analysisPrompt = `
      分析此对话中玩家的意图：
      玩家说："${input}"
      
      上下文：
      - NPC：${context.speaker.name} (${context.speaker.profession})
      - 位置：${context.location.name}
      - 时间：${context.timeOfDay}
      - 关系：${context.relationship.type}
      - 最近事件：${context.recentEvents.map(e => e.type).join(', ')}
      
      将意图分类为以下之一：
      - QUEST_REQUEST
      - INFORMATION_SEEKING
      - SOCIAL_INTERACTION
      - TRADING
      - COMPLAINT
      - COMPLIMENT
      - THREAT
      - QUESTION_ABOUT_WORLD
      - PERSONAL_QUESTION
      - GOODBYE
      
      同时提取提到的任何主题、物品或位置。
    `;
    
    try {
      const intentAnalysis = await this.deepseekController.analyzeText(analysisPrompt);
      return this.parseIntentAnalysis(intentAnalysis);
    } catch (error) {
      console.error('意图分析失败:', error);
      return { type: 'SOCIAL_INTERACTION', confidence: 0.5 };
    }
  }
  
  private applyPersonalityModifications(response: DialogueLine, personality: Personality, context: DialogueContext): DialogueLine {
    const modifier = this.personalityModifiers.get(personality.type);
    if (!modifier) return response;
    
    let modifiedText = response.text;
    
    // 应用词汇修改
    modifiedText = modifier.modifyVocabulary(modifiedText, personality.traits);
    
    // 应用语气修改
    modifiedText = modifier.modifyTone(modifiedText, personality.traits);
    
    // 应用语音模式修改
    modifiedText = modifier.modifySpeechPatterns(modifiedText, personality.traits);
    
    return {
      ...response,
      text: modifiedText,
      modifications: modifier.getModificationTags()
    };
  }
  
  private applyEmotionalModifications(response: DialogueLine, emotionalState: EmotionalState): DialogueLine {
    const emotionalModifiers = this.getEmotionalModifiers(emotionalState);
    
    let modifiedText = response.text;
    
    // 添加情绪指示器
    if (emotionalState.intensity > 0.7) {
      modifiedText = this.addEmotionalIntensity(modifiedText, emotionalState);
    }
    
    // 根据情绪状态修改句子结构
    if (emotionalState.type === 'angry') {
      modifiedText = this.makeMoreDirect(modifiedText);
    } else if (emotionalState.type === 'sad') {
      modifiedText = this.makeMoreReserved(modifiedText);
    } else if (emotionalState.type === 'excited') {
      modifiedText = this.makeMoreEnthusiastic(modifiedText);
    }
    
    return {
      ...response,
      text: modifiedText,
      emotionalIndicators: emotionalModifiers.indicators
    };
  }
  
  private updateConversationMemory(context: DialogueContext, playerInput: string, response: DialogueLine): void {
    const conversationId = `${context.speaker.id}-${context.listener.id}`;
    const memory = this.conversationMemory.get(conversationId) || {
      topics: [],
      playerPreferences: {},
      relationshipDevelopment: 0,
      lastInteraction: Date.now()
    };
    
    // 从对话中提取主题
    const topics = this.extractTopics(playerInput, response.text);
    memory.topics.push(...topics);
    
    // 根据互动质量更新关系
    const interactionQuality = this.assessInteractionQuality(playerInput, response);
    memory.relationshipDevelopment += interactionQuality * 0.1;
    
    // 更新玩家偏好
    this.updatePlayerPreferences(memory.playerPreferences, playerInput, response);
    
    memory.lastInteraction = Date.now();
    this.conversationMemory.set(conversationId, memory);
  }
}
```

## AI 记忆与学习

### NPC 记忆系统

持久化记忆和学习：

```typescript
interface AIMemory {
  shortTerm: ShortTermMemory;
  longTerm: LongTermMemory;
  episodic: EpisodicMemory;
  semantic: SemanticMemory;
  procedural: ProceduralMemory;
}

interface MemoryEntry {
  id: string;
  type: MemoryType;
  content: any;
  timestamp: number;
  importance: number;
  emotionalWeight: number;
  tags: string[];
  decayRate: number;
}

class AdvancedAIMemory implements AIMemory {
  private memories: Map<string, MemoryEntry> = new Map();
  private memoryGraph: MemoryGraph = new MemoryGraph();
  private forgettingCurve: ForgettingCurve = new ForgettingCurve();
  
  constructor(private npcId: string) {
    this.initializeMemorySystems();
  }
  
  storeMemory(content: any, type: MemoryType, importance: number = 0.5): string {
    const memoryId = generateMemoryId();
    
    const entry: MemoryEntry = {
      id: memoryId,
      type,
      content,
      timestamp: Date.now(),
      importance,
      emotionalWeight: this.calculateEmotionalWeight(content),
      tags: this.extractTags(content, type),
      decayRate: this.calculateDecayRate(type, importance)
    };
    
    this.memories.set(memoryId, entry);
    this.memoryGraph.addNode(memoryId, entry);
    
    // 创建与相关记忆的关联
    this.createAssociations(entry);
    
    // 应用记忆巩固
    this.consolidateMemories();
    
    return memoryId;
  }
  
  retrieveMemory(query: MemoryQuery): MemoryEntry[] {
    // 应用衰减到所有记忆
    this.applyMemoryDecay();
    
    // 搜索相关记忆
    const relevantMemories = this.searchMemories(query);
    
    // 按相关性和重要性排序
    const rankedMemories = this.rankMemories(relevantMemories, query);
    
    // 应用基于检索的学习（强化检索到的记忆）
    this.strengthenRetrievedMemories(rankedMemories);
    
    return rankedMemories.slice(0, query.limit || 10);
  }
  
  private searchMemories(query: MemoryQuery): MemoryEntry[] {
    const results: MemoryEntry[] = [];
    
    // 语义搜索
    if (query.keywords) {
      results.push(...this.semanticSearch(query.keywords));
    }
    
    // 时间搜索
    if (query.timeRange) {
      results.push(...this.temporalSearch(query.timeRange));
    }
    
    // 情绪搜索
    if (query.emotionalRange) {
      results.push(...this.emotionalSearch(query.emotionalRange));
    }
    
    // 上下文搜索
    if (query.context) {
      results.push(...this.contextualSearch(query.context));
    }
    
    // 去重和排序
    return this.deduplicateAndRank(results, query);
  }
  
  private semanticSearch(keywords: string[]): MemoryEntry[] {
    const results: MemoryEntry[] = [];
    
    for (const [id, memory] of this.memories) {
      let relevanceScore = 0;
      
      // 检查直接关键词匹配
      for (const keyword of keywords) {
        if (memory.tags.includes(keyword.toLowerCase())) {
          relevanceScore += 0.5;
        }
        
        // 检查内容相似性
        const contentText = JSON.stringify(memory.content).toLowerCase();
        if (contentText.includes(keyword.toLowerCase())) {
          relevanceScore += 0.3;
        }
      }
      
      // 使用词嵌入检查语义相似性
      const semanticScore = this.calculateSemanticSimilarity(memory, keywords);
      relevanceScore += semanticScore * 0.2;
      
      if (relevanceScore > 0.3) {
        results.push({ ...memory, relevanceScore });
      }
    }
    
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
  
  private createAssociations(newMemory: MemoryEntry): void {
    // 找到相关记忆
    const relatedMemories = this.findRelatedMemories(newMemory);
    
    for (const related of relatedMemories) {
      const associationStrength = this.calculateAssociationStrength(newMemory, related);
      
      if (associationStrength > 0.3) {
        this.memoryGraph.addEdge(newMemory.id, related.id, {
          strength: associationStrength,
          type: this.determineAssociationType(newMemory, related)
        });
      }
    }
  }
  
  private consolidateMemories(): void {
    // 找到可以巩固的相似记忆
    const consolidationCandidates = this.findConsolidationCandidates();
    
    for (const group of consolidationCandidates) {
      if (group.length > 3) {
        const consolidated = this.createConsolidatedMemory(group);
        
        // 存储巩固后的记忆
        this.storeMemory(consolidated, 'semantic', 0.8);
        
        // 将原始记忆标记为已巩固
        for (const memory of group) {
          memory.content.consolidated = true;
          memory.importance *= 0.5; // 降低已巩固记忆的重要性
        }
      }
    }
  }
  
  getMemorySummary(timeRange: TimeRange): MemorySummary {
    const memories = this.retrieveMemory({
      timeRange,
      limit: 100
    });
    
    const summary: MemorySummary = {
      totalMemories: memories.length,
      dominantEmotions: this.analyzeEmotionalTrends(memories),
      keyTopics: this.extractKeyTopics(memories),
      significantEvents: this.identifySignificantEvents(memories),
      relationshipChanges: this.trackRelationshipChanges(memories),
      behavioralPatterns: this.identifyBehavioralPatterns(memories)
    };
    
    return summary;
  }
}
```

## 性能优化

### AI 性能管理

高效的 AI 处理和资源管理：

```typescript
interface AIPerformanceConfig {
  maxConcurrentRequests: number;
  requestTimeout: number;
  cacheSize: number;
  updateBatchSize: number;
  priorityQueue: boolean;
  adaptiveScheduling: boolean;
}

class AIPerformanceManager {
  private requestQueue: AIRequest[] = [];
  private activeRequests: Map<string, ActiveRequest> = new Map();
  private responseCache: LRUCache<string, CachedResponse>;
  private performanceMetrics: PerformanceMetrics;
  private adaptiveScheduler: AdaptiveScheduler;
  
  constructor(private config: AIPerformanceConfig) {
    this.responseCache = new LRUCache(config.cacheSize);
    this.performanceMetrics = new PerformanceMetrics();
    this.adaptiveScheduler = new AdaptiveScheduler(config);
  }
  
  async processRequest(request: AIRequest): Promise<AIResponse> {
    const startTime = performance.now();
    
    // 首先检查缓存
    const cacheKey = this.generateCacheKey(request);
    const cachedResponse = this.responseCache.get(cacheKey);
    
    if (cachedResponse && !this.isCacheStale(cachedResponse)) {
      this.performanceMetrics.recordCacheHit();
      return cachedResponse.data;
    }
    
    // 如果达到容量上限，将请求排队
    if (this.activeRequests.size >= this.config.maxConcurrentRequests) {
      await this.queueRequest(request);
    }
    
    // 处理请求
    const response = await this.executeRequest(request);
    
    // 缓存响应
    this.responseCache.set(cacheKey, {
      data: response,
      timestamp: Date.now(),
      requestType: request.type
    });
    
    // 记录指标
    const processingTime = performance.now() - startTime;
    this.performanceMetrics.recordRequest(processingTime, request.type);
    
    return response;
  }
  
  private async executeRequest(request: AIRequest): Promise<AIResponse> {
    const requestId = generateRequestId();
    
    const activeRequest: ActiveRequest = {
      id: requestId,
      request,
      startTime: Date.now(),
      priority: this.calculatePriority(request),
      timeout: setTimeout(() => this.handleTimeout(requestId), this.config.requestTimeout)
    };
    
    this.activeRequests.set(requestId, activeRequest);
    
    try {
      const response = await this.sendToController(request);
      clearTimeout(activeRequest.timeout);
      return response;
    } catch (error) {
      clearTimeout(activeRequest.timeout);
      throw error;
    } finally {
      this.activeRequests.delete(requestId);
      this.processQueue();
    }
  }
  
  private calculatePriority(request: AIRequest): number {
    let priority = 0;
    
    // 按请求类型设置基础优先级
    const typePriority = {
      'combat': 10,
      'dialogue': 8,
      'behavior': 6,
      'quest': 7,
      'ambient': 3
    };
    
    priority += typePriority[request.type] || 5;
    
    // 提高面向玩家的请求优先级
    if (request.isPlayerFacing) {
      priority += 5;
    }
    
    // 提高时间敏感请求的优先级
    if (request.urgency === 'high') {
      priority += 3;
    }
    
    // 根据 NPC 重要性调整
    if (request.npcImportance) {
      priority += request.npcImportance * 2;
    }
    
    return priority;
  }
  
  private processQueue(): void {
    if (this.requestQueue.length === 0 || this.activeRequests.size >= this.config.maxConcurrentRequests) {
      return;
    }
    
    // 按优先级排序
    this.requestQueue.sort((a, b) => b.priority - a.priority);
    
    // 处理最高优先级请求
    const nextRequest = this.requestQueue.shift();
    if (nextRequest) {
      this.executeRequest(nextRequest.request).then(nextRequest.resolve).catch(nextRequest.reject);
    }
  }
  
  optimizePerformance(): void {
    const metrics = this.performanceMetrics.getMetrics();
    
    // 根据命中率调整缓存大小
    if (metrics.cacheHitRate > 0.8 && this.responseCache.size < this.config.cacheSize * 0.8) {
      this.responseCache.resize(this.config.cacheSize * 1.2);
    } else if (metrics.cacheHitRate < 0.5) {
      this.responseCache.resize(this.config.cacheSize * 0.8);
    }
    
    // 根据响应时间调整并发度
    if (metrics.averageResponseTime > 2000) {
      this.config.maxConcurrentRequests = Math.max(1, this.config.maxConcurrentRequests - 1);
    } else if (metrics.averageResponseTime < 500 && metrics.successRate > 0.95) {
      this.config.maxConcurrentRequests = Math.min(20, this.config.maxConcurrentRequests + 1);
    }
    
    // 更新自适应调度器
    this.adaptiveScheduler.updateParameters(metrics);
  }
  
  getPerformanceReport(): PerformanceReport {
    const metrics = this.performanceMetrics.getMetrics();
    
    return {
      averageResponseTime: metrics.averageResponseTime,
      successRate: metrics.successRate,
      cacheHitRate: metrics.cacheHitRate,
      queueLength: this.requestQueue.length,
      activeRequests: this.activeRequests.size,
      cacheSize: this.responseCache.size,
      recommendations: this.generatePerformanceRecommendations(metrics)
    };
  }
}
```

## 与游戏系统的集成

### AI-游戏集成

与游戏机制的无缝集成：

```typescript
class AIGameIntegration {
  private integrationPoints: Map<string, IntegrationPoint> = new Map();
  private eventHandlers: Map<string, EventHandler[]> = new Map();
  private dataSync: DataSynchronizer;
  
  constructor(
    private aiManager: AIManager,
    private gameEngine: GameEngine
  ) {
    this.dataSync = new DataSynchronizer();
    this.setupIntegrationPoints();
  }
  
  private setupIntegrationPoints(): void {
    // 战斗集成
    this.integrationPoints.set('combat', new CombatAIIntegration());
    
    // 经济集成
    this.integrationPoints.set('economy', new EconomyAIIntegration());
    
    // 社交集成
    this.integrationPoints.set('social', new SocialAIIntegration());
    
    // 世界集成
    this.integrationPoints.set('world', new WorldAIIntegration());
    
    // 任务集成
    this.integrationPoints.set('quest', new QuestAIIntegration());
  }
  
  async syncGameStateToAI(): Promise<void> {
    const gameState = this.gameEngine.getState();
    
    // 同步玩家数据
    await this.syncPlayerData(gameState.players);
    
    // 同步世界数据
    await this.syncWorldData(gameState.world);
    
    // 同步经济数据
    await this.syncEconomicData(gameState.economy);
    
    // 同步社交数据
    await this.syncSocialData(gameState.social);
    
    // 基于状态变化触发 AI 更新
    await this.triggerAIUpdates(gameState);
  }
  
  private async syncPlayerData(players: Player[]): Promise<void> {
    for (const player of players) {
      const playerContext = {
        id: player.id,
        level: player.getLevel(),
        skills: player.getSkills(),
        inventory: player.getInventorySummary(),
        reputation: player.getReputation(),
        recentActions: player.getRecentActions(10)
      };
      
      await this.aiManager.updatePlayerContext(player.id, playerContext);
    }
  }
  
  handleGameEvent(event: GameEvent): void {
    const handlers = this.eventHandlers.get(event.type) || [];
    
    for (const handler of handlers) {
      try {
        handler(event);
      } catch (error) {
        console.error(`处理游戏事件 ${event.type} 时出错:`, error);
      }
    }
  }
  
  async generateDynamicContent(request: DynamicContentRequest): Promise<DynamicContent> {
    const context = await this.buildDynamicContext(request);
    
    switch (request.type) {
      case 'npc_dialogue':
        return this.generateDynamicDialogue(context);
      
      case 'quest_suggestion':
        return this.generateDynamicQuest(context);
      
      case 'world_reaction':
        return this.generateWorldReaction(context);
      
      case 'economic_event':
        return this.generateEconomicEvent(context);
      
      default:
        throw new Error(`未知的动态内容类型: ${request.type}`);
    }
  }
  
  private async generateDynamicDialogue(context: DynamicContext): Promise<DynamicDialogue> {
    const npc = context.npc;
    const player = context.player;
    const situation = context.situation;
    
    // 获取 AI 生成的对话
    const aiResponse = await this.aiManager.requestDialogue(npc, {
      playerId: player.id,
      context: situation,
      tone: context.desiredTone,
      length: context.preferredLength
    });
    
    // 与游戏机制集成
    const integratedDialogue = this.integrateGameMechanics(aiResponse, context);
    
    return {
      text: integratedDialogue.text,
      speaker: npc.name,
      emotionalIndicators: integratedDialogue.emotionalIndicators,
      gameEffects: integratedDialogue.effects,
      followUpOptions: integratedDialogue.options
    };
  }
}
```

## 配置与调优

### AI 配置系统

灵活的配置和调优：

```typescript
interface AIConfiguration {
  global: GlobalAIConfig;
  controllers: ControllerConfigs;
  behaviorTrees: BehaviorTreeConfigs;
  personalities: PersonalityConfigs;
  memory: MemoryConfigs;
  performance: PerformanceConfigs;
  integration: IntegrationConfigs;
}

class AIConfigurationManager {
  private configurations: Map<string, AIConfiguration> = new Map();
  private activeConfig: string = 'default';
  private validationRules: ValidationRule[] = [];
  
  constructor() {
    this.initializeValidationRules();
    this.loadDefaultConfigurations();
  }
  
  loadConfiguration(name: string, config: AIConfiguration): void {
    // 验证配置
    const validationResult = this.validateConfiguration(config);
    if (!validationResult.isValid) {
      throw new Error(`配置无效: ${validationResult.errors.join(', ')}`);
    }
    
    // 存储配置
    this.configurations.set(name, this.deepClone(config));
    
    // 如果是活动配置，则应用
    if (name === this.activeConfig) {
      this.applyConfiguration(config);
    }
  }
  
  getConfiguration(name?: string): AIConfiguration {
    const configName = name || this.activeConfig;
    const config = this.configurations.get(configName);
    
    if (!config) {
      throw new Error(`配置 '${configName}' 未找到`);
    }
    
    return this.deepClone(config);
  }
  
  updateConfiguration(name: string, updates: Partial<AIConfiguration>): void {
    const currentConfig = this.getConfiguration(name);
    const updatedConfig = this.deepMerge(currentConfig, updates);
    
    this.loadConfiguration(name, updatedConfig);
  }
  
  createConfigurationPreset(preset: PresetType): AIConfiguration {
    const baseConfig = this.getConfiguration('default');
    
    switch (preset) {
      case 'combat_focused':
        return this.createCombatFocusedConfig(baseConfig);
      
      case 'social_focused':
        return this.createSocialFocusedConfig(baseConfig);
      
      case 'exploration_focused':
        return this.createExplorationFocusedConfig(baseConfig);
      
      case 'performance_optimized':
        return this.createPerformanceOptimizedConfig(baseConfig);
      
      case 'story_rich':
        return this.createStoryRichConfig(baseConfig);
      
      default:
        return baseConfig;
    }
  }
  
  private createCombatFocusedConfig(base: AIConfiguration): AIConfiguration {
    return {
      ...base,
      behaviorTrees: {
        ...base.behaviorTrees,
        combatPriority: 0.8,
        socialPriority: 0.3,
        explorationPriority: 0.4
      },
      controllers: {
        ...base.controllers,
        deepseek: {
          ...base.controllers.deepseek,
          temperature: 0.4, // 更专注的响应
          behaviorComplexity: 'high'
        }
      },
      personalities: {
        ...base.personalities,
        traitWeights: {
          aggression: 0.7,
          courage: 0.8,
          tacticalThinking: 0.9
        }
      }
    };
  }
  
  getTuningParameters(): TuningParameters {
    const config = this.getConfiguration();
    
    return {
      dialogue: {
        creativity: config.controllers.kimi.temperature,
        responseTime: config.performance.requestTimeout,
        cacheSize: config.performance.cacheSize
      },
      behavior: {
        updateInterval: config.global.updateInterval,
        treeComplexity: config.behaviorTrees.maxDepth,
        learningRate: config.memory.learningRate
      },
      performance: {
        maxConcurrentRequests: config.performance.maxConcurrentRequests,
        batchSize: config.performance.updateBatchSize,
        priorityQueue: config.performance.priorityQueue
      }
    };
  }
  
  exportConfiguration(name: string): string {
    const config = this.getConfiguration(name);
    return JSON.stringify(config, null, 2);
  }
  
  importConfiguration(jsonString: string): void {
    try {
      const config = JSON.parse(jsonString) as AIConfiguration;
      this.loadConfiguration('imported', config);
    } catch (error) {
      throw new Error(`导入配置失败: ${error.message}`);
    }
  }
}
```

## 相关文档

- [开发指南](development-guide-zh.md) - 综合开发指南
- [架构概述](architecture-zh.md) - 系统设计和组件交互
- [API 参考](api-reference-zh.md) - 完整的 API 文档
- [性能优化](performance-zh.md) - 优化策略和基准测试
- [游戏机制](game-mechanics-zh.md) - 核心游戏系统
- [世界生成](world-generation-zh.md) - 程序化生成算法

---

*更多信息，请访问 [Quantelix AI](https://quantelixai.com/) 和 [Nebulix AI](https://nebulix.quantelixai.com)*