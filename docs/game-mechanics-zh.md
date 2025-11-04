# 游戏机制

Quantelix AI 游戏引擎核心游戏系统的综合文档。

## 目录
- [核心游戏系统](#核心游戏系统)
- [玩家机制](#玩家机制)
- [战斗系统](#战斗系统)
- [背包系统](#背包系统)
- [制作系统](#制作系统)
- [技能系统](#技能系统)
- [NPC交互](#npc交互)
- [世界交互](#世界交互)
- [昼夜循环](#昼夜循环)
- [天气系统](#天气系统)
- [经济系统](#经济系统)
- [任务系统](#任务系统)
- [进阶系统](#进阶系统)
- [游戏平衡](#游戏平衡)
- [相关文档](#相关文档)

## 核心游戏系统

### 系统架构

游戏机制建立在模块化系统架构之上：

```typescript
interface GameMechanicsConfig {
  player: PlayerMechanicsConfig;
  combat: CombatConfig;
  inventory: InventoryConfig;
  crafting: CraftingConfig;
  skills: SkillConfig;
  economy: EconomyConfig;
  weather: WeatherConfig;
}
```

### 游戏状态管理器

所有游戏机制的中心管理器：

```typescript
class GameStateManager {
  private player: Player;
  private inventory: InventoryManager;
  private combat: CombatManager;
  private crafting: CraftingManager;
  private skills: SkillManager;
  private economy: EconomyManager;
  private weather: WeatherManager;
  
  constructor(private eventBus: EventBus) {
    this.initializeSystems();
  }
  
  private initializeSystems(): void {
    this.inventory = new InventoryManager(this.eventBus);
    this.combat = new CombatManager(this.eventBus);
    this.crafting = new CraftingManager(this.eventBus);
    this.skills = new SkillManager(this.eventBus);
    this.economy = new EconomyManager(this.eventBus);
    this.weather = new WeatherManager(this.eventBus);
  }
  
  update(deltaMs: number): void {
    this.combat.update(deltaMs);
    this.skills.update(deltaMs);
    this.weather.update(deltaMs);
  }
}
```

## 玩家机制

### 玩家属性

核心玩家统计数据和属性：

```typescript
interface PlayerAttributes {
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  mana: number;
  maxMana: number;
  level: number;
  experience: number;
  experienceToNext: number;
  
  // 主要属性
  strength: number;
  agility: number;
  intelligence: number;
  vitality: number;
  wisdom: number;
  charisma: number;
}
```

### 玩家移动

带物理集成的移动机制：

```typescript
class PlayerMovement {
  private velocity: Vector2 = { x: 0, y: 0 };
  private acceleration = 0.8;
  private maxSpeed = 5;
  private friction = 0.85;
  private jumpForce = 12;
  private isGrounded = false;
  
  constructor(private player: Player, private physics: PhysicsEngine) {}
  
  update(input: InputState, deltaMs: number): void {
    this.handleInput(input);
    this.applyPhysics(deltaMs);
    this.updatePosition();
  }
  
  private handleInput(input: InputState): void {
    if (input.left) {
      this.velocity.x = Math.max(this.velocity.x - this.acceleration, -this.maxSpeed);
    }
    if (input.right) {
      this.velocity.x = Math.min(this.velocity.x + this.acceleration, this.maxSpeed);
    }
    if (input.up && this.isGrounded) {
      this.velocity.y = -this.jumpForce;
      this.isGrounded = false;
    }
  }
  
  private applyPhysics(deltaMs: number): void {
    // 应用摩擦力
    this.velocity.x *= this.friction;
    
    // 应用重力
    if (!this.isGrounded) {
      this.velocity.y += 0.5; // 重力
    }
    
    // 限制速度
    this.velocity.x = MathUtils.clamp(this.velocity.x, -this.maxSpeed, this.maxSpeed);
    this.velocity.y = MathUtils.clamp(this.velocity.y, -20, 20);
  }
  
  private updatePosition(): void {
    const body = this.player.getBody();
    Matter.Body.setVelocity(body, this.velocity);
  }
}
```

### 玩家生命系统

带再生的生命管理：

```typescript
class PlayerHealth {
  private health: number;
  private maxHealth: number;
  private regenerationRate = 0.1; // 每秒
  private lastDamageTime = 0;
  private regenerationDelay = 5000; // 受伤后5秒
  
  constructor(initialHealth: number, private eventBus: EventBus) {
    this.health = initialHealth;
    this.maxHealth = initialHealth;
  }
  
  takeDamage(amount: number, source: string): void {
    this.health = Math.max(0, this.health - amount);
    this.lastDamageTime = Date.now();
    
    this.eventBus.emit('player:damage', {
      amount,
      source,
      currentHealth: this.health,
      maxHealth: this.maxHealth
    });
    
    if (this.health <= 0) {
      this.handleDeath();
    }
  }
  
  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
    
    this.eventBus.emit('player:heal', {
      amount,
      currentHealth: this.health,
      maxHealth: this.maxHealth
    });
  }
  
  update(deltaMs: number): void {
    this.handleRegeneration(deltaMs);
  }
  
  private handleRegeneration(deltaMs: number): void {
    const timeSinceDamage = Date.now() - this.lastDamageTime;
    
    if (timeSinceDamage > this.regenerationDelay && this.health < this.maxHealth) {
      const regenAmount = this.regenerationRate * (deltaMs / 1000);
      this.health = Math.min(this.maxHealth, this.health + regenAmount);
    }
  }
  
  private handleDeath(): void {
    this.eventBus.emit('player:death', {
      position: this.player.getPosition(),
      inventory: this.player.getInventory()
    });
  }
  
  getHealth(): number { return this.health; }
  getMaxHealth(): number { return this.maxHealth; }
  getHealthPercentage(): number { return this.health / this.maxHealth; }
}
```

## 战斗系统

### 战斗机制

带伤害计算的核心战斗系统：

```typescript
interface CombatStats {
  attackPower: number;
  defense: number;
  criticalChance: number;
  criticalMultiplier: number;
  attackSpeed: number;
  range: number;
}

class CombatManager {
  private combatants = new Map<string, Combatant>();
  private combatLog: CombatEvent[] = [];
  
  constructor(private eventBus: EventBus) {}
  
  startCombat(attacker: Combatant, defender: Combatant): CombatResult {
    const distance = MathUtils.distance(
      attacker.getPosition(),
      defender.getPosition()
    );
    
    if (distance > attacker.getRange()) {
      return { success: false, reason: 'out_of_range' };
    }
    
    const damage = this.calculateDamage(attacker, defender);
    const result = this.applyDamage(defender, damage);
    
    this.logCombatEvent({
      attacker: attacker.id,
      defender: defender.id,
      damage: result.damage,
      critical: result.critical,
      timestamp: Date.now()
    });
    
    return {
      success: true,
      damage: result.damage,
      critical: result.critical,
      remainingHealth: defender.getHealth()
    };
  }
  
  private calculateDamage(attacker: Combatant, defender: Combatant): number {
    const baseDamage = attacker.getAttackPower();
    const defense = defender.getDefense();
    
    // 伤害公式: damage = base * (1 - defense/(defense + 100))
    const effectiveDamage = baseDamage * (1 - defense / (defense + 100));
    
    // 暴击计算
    const isCritical = Math.random() < attacker.getCriticalChance();
    const multiplier = isCritical ? attacker.getCriticalMultiplier() : 1;
    
    return Math.floor(effectiveDamage * multiplier);
  }
  
  private applyDamage(target: Combatant, damage: number): { damage: number; critical: boolean } {
    const isCritical = Math.random() < 0.1; // 10% 基础暴击率
    const finalDamage = isCritical ? damage * 1.5 : damage;
    
    target.takeDamage(finalDamage);
    
    return { damage: finalDamage, critical: isCritical };
  }
  
  private logCombatEvent(event: CombatEvent): void {
    this.combatLog.push(event);
    
    // 只保留最近100个事件
    if (this.combatLog.length > 100) {
      this.combatLog.shift();
    }
    
    this.eventBus.emit('combat:event', event);
  }
}
```

### 武器系统

武器机制和属性：

```typescript
interface WeaponStats {
  damage: number;
  attackSpeed: number;
  range: number;
  criticalChance: number;
  criticalMultiplier: number;
  durability: number;
  maxDurability: number;
}

enum WeaponType {
  SWORD = 'sword',
  BOW = 'bow',
  STAFF = 'staff',
  DAGGER = 'dagger',
  HAMMER = 'hammer'
}

class Weapon {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly type: WeaponType,
    public readonly stats: WeaponStats,
    public readonly rarity: Rarity
  ) {}
  
  getEffectiveDamage(): number {
    // 应用耐久度惩罚
    const durabilityFactor = this.stats.durability / this.stats.maxDurability;
    return this.stats.damage * durabilityFactor;
  }
  
  takeDamage(amount: number): void {
    this.stats.durability = Math.max(0, this.stats.durability - amount);
  }
  
  canBeRepaired(): boolean {
    return this.stats.durability < this.stats.maxDurability;
  }
  
  repair(amount: number): void {
    this.stats.durability = Math.min(
      this.stats.maxDurability,
      this.stats.durability + amount
    );
  }
  
  isBroken(): boolean {
    return this.stats.durability <= 0;
  }
}
```

## 背包系统

### 背包管理

物品存储和管理：

```typescript
interface InventorySlot {
  item: Item | null;
  quantity: number;
  maxStack: number;
}

class InventoryManager {
  private slots: InventorySlot[];
  private maxSlots: number;
  private equipment: Map<EquipmentSlot, Equipment | null>;
  
  constructor(maxSlots: number = 20, private eventBus: EventBus) {
    this.maxSlots = maxSlots;
    this.slots = new Array(maxSlots).fill(null).map(() => ({
      item: null,
      quantity: 0,
      maxStack: 99
    }));
    this.equipment = new Map();
  }
  
  addItem(item: Item, quantity: number = 1): boolean {
    // 首先尝试与现有物品堆叠
    const stackableSlot = this.findStackableSlot(item);
    if (stackableSlot !== -1) {
      const slot = this.slots[stackableSlot];
      const canAdd = Math.min(quantity, slot.maxStack - slot.quantity);
      slot.quantity += canAdd;
      
      if (canAdd < quantity) {
        // 将剩余物品添加到新槽位
        return this.addItemToNewSlot(item, quantity - canAdd);
      }
      
      this.eventBus.emit('inventory:item-added', { item, quantity: canAdd });
      return true;
    }
    
    // 添加到新槽位
    return this.addItemToNewSlot(item, quantity);
  }
  
  private findStackableSlot(item: Item): number {
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (slot.item && slot.item.id === item.id && slot.quantity < slot.maxStack) {
        return i;
      }
    }
    return -1;
  }
  
  private addItemToNewSlot(item: Item, quantity: number): boolean {
    const emptySlot = this.findEmptySlot();
    if (emptySlot === -1) {
      this.eventBus.emit('inventory:full', { item, quantity });
      return false;
    }
    
    this.slots[emptySlot] = {
      item,
      quantity,
      maxStack: item.maxStack || 99
    };
    
    this.eventBus.emit('inventory:item-added', { item, quantity });
    return true;
  }
  
  private findEmptySlot(): number {
    for (let i = 0; i < this.slots.length; i++) {
      if (!this.slots[i].item) {
        return i;
      }
    }
    return -1;
  }
  
  removeItem(slotIndex: number, quantity: number = 1): boolean {
    const slot = this.slots[slotIndex];
    if (!slot.item || slot.quantity < quantity) {
      return false;
    }
    
    slot.quantity -= quantity;
    
    if (slot.quantity <= 0) {
      this.slots[slotIndex] = {
        item: null,
        quantity: 0,
        maxStack: 99
      };
    }
    
    this.eventBus.emit('inventory:item-removed', {
      item: slot.item,
      quantity,
      slotIndex
    });
    
    return true;
  }
  
  getTotalWeight(): number {
    return this.slots.reduce((total, slot) => {
      if (slot.item) {
        return total + (slot.item.weight * slot.quantity);
      }
      return total;
    }, 0);
  }
  
  isFull(): boolean {
    return this.findEmptySlot() === -1 && !this.hasPartialStacks();
  }
  
  private hasPartialStacks(): boolean {
    return this.slots.some(slot => 
      slot.item && slot.quantity < slot.maxStack
    );
  }
}
```

### 物品系统

物品定义和属性：

```typescript
enum ItemType {
  WEAPON = 'weapon',
  ARMOR = 'armor',
  CONSUMABLE = 'consumable',
  MATERIAL = 'material',
  TOOL = 'tool',
  QUEST = 'quest'
}

enum Rarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}

interface Item {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: Rarity;
  weight: number;
  value: number;
  maxStack: number;
  icon: string;
  
  // 类型特定属性
  weaponStats?: WeaponStats;
  armorStats?: ArmorStats;
  consumableEffect?: ConsumableEffect;
  toolPower?: number;
}

interface ConsumableEffect {
  healthRestore?: number;
  staminaRestore?: number;
  manaRestore?: number;
  duration?: number;
  buffs?: Buff[];
}
```

## 制作系统

### 制作配方

基于配方的制作系统：

```typescript
interface CraftingRecipe {
  id: string;
  name: string;
  description: string;
  result: Item;
  quantity: number;
  ingredients: Ingredient[];
  requiredTools?: ToolRequirement[];
  requiredStation?: CraftingStation;
  craftingTime: number;
  skillRequirement?: SkillRequirement;
}

interface Ingredient {
  itemId: string;
  quantity: number;
  alternatives?: string[]; // 可使用的替代物品
}

interface ToolRequirement {
  toolType: ToolType;
  minimumPower: number;
}

enum CraftingStation {
  WORKBENCH = 'workbench',
  FORGE = 'forge',
  ALCHEMY_TABLE = 'alchemy_table',
  COOKING_FIRE = 'cooking_fire',
  TANNERY = 'tannery'
}

class CraftingManager {
  private recipes: Map<string, CraftingRecipe> = new Map();
  private activeCrafting: Map<string, CraftingSession> = new Map();
  
  constructor(private inventory: InventoryManager, private eventBus: EventBus) {
    this.loadRecipes();
  }
  
  canCraft(recipeId: string, inventory: InventoryManager): CraftingCheck {
    const recipe = this.recipes.get(recipeId);
    if (!recipe) {
      return { canCraft: false, reason: 'recipe_not_found' };
    }
    
    // 检查材料
    for (const ingredient of recipe.ingredients) {
      const available = inventory.getItemCount(ingredient.itemId);
      if (available < ingredient.quantity) {
        return { 
          canCraft: false, 
          reason: 'insufficient_ingredients',
          missing: ingredient.itemId
        };
      }
    }
    
    // 检查工具
    if (recipe.requiredTools) {
      for (const toolReq of recipe.requiredTools) {
        const hasTool = inventory.hasTool(toolReq.toolType, toolReq.minimumPower);
        if (!hasTool) {
          return { 
            canCraft: false, 
            reason: 'insufficient_tools',
            missingTool: toolReq.toolType
          };
        }
      }
    }
    
    // 检查制作站
    if (recipe.requiredStation) {
      const hasStation = this.hasCraftingStation(recipe.requiredStation);
      if (!hasStation) {
        return { 
          canCraft: false, 
          reason: 'missing_station',
          missingStation: recipe.requiredStation
        };
      }
    }
    
    return { canCraft: true };
  }
  
  startCrafting(recipeId: string, crafterId: string): CraftingResult {
    const check = this.canCraft(recipeId, this.inventory);
    if (!check.canCraft) {
      return { success: false, reason: check.reason };
    }
    
    const recipe = this.recipes.get(recipeId)!;
    const session: CraftingSession = {
      recipeId,
      crafterId,
      startTime: Date.now(),
      progress: 0,
      estimatedCompletion: Date.now() + recipe.craftingTime
    };
    
    this.activeCrafting.set(crafterId, session);
    
    // 消耗材料
    for (const ingredient of recipe.ingredients) {
      this.inventory.removeItemById(ingredient.itemId, ingredient.quantity);
    }
    
    this.eventBus.emit('crafting:started', session);
    
    return { success: true, session };
  }
  
  updateCrafting(deltaMs: number): void {
    for (const [crafterId, session] of this.activeCrafting) {
      const recipe = this.recipes.get(session.recipeId)!;
      const elapsed = Date.now() - session.startTime;
      const progress = Math.min(1, elapsed / recipe.craftingTime);
      
      session.progress = progress;
      
      if (progress >= 1) {
        this.completeCrafting(crafterId, session);
      }
    }
  }
  
  private completeCrafting(crafterId: string, session: CraftingSession): void {
    const recipe = this.recipes.get(session.recipeId)!;
    
    // 将结果添加到背包
    this.inventory.addItem(recipe.result, recipe.quantity);
    
    // 授予制作经验
    this.grantCraftingExperience(crafterId, recipe);
    
    this.eventBus.emit('crafting:completed', {
      crafterId,
      recipeId: session.recipeId,
      result: recipe.result,
      quantity: recipe.quantity
    });
    
    this.activeCrafting.delete(crafterId);
  }
}
```

## 技能系统

### 技能进阶

基于技能的进阶系统：

```typescript
enum SkillType {
  COMBAT = 'combat',
  CRAFTING = 'crafting',
  GATHERING = 'gathering',
  MAGIC = 'magic',
  STEALTH = 'stealth',
  DIPLOMACY = 'diplomacy'
}

interface Skill {
  type: SkillType;
  level: number;
  experience: number;
  experienceToNext: number;
  modifiers: SkillModifier[];
}

interface SkillModifier {
  type: ModifierType;
  value: number;
  condition?: string;
}

enum ModifierType {
  DAMAGE_BONUS = 'damage_bonus',
  CRAFTING_SPEED = 'crafting_speed',
  GATHERING_YIELD = 'gathering_yield',
  MANA_COST_REDUCTION = 'mana_cost_reduction',
  STEALTH_DURATION = 'stealth_duration',
  DIALOGUE_SUCCESS = 'dialogue_success'
}

class SkillManager {
  private skills: Map<SkillType, Skill> = new Map();
  private experienceMultipliers = new Map<SkillType, number>();
  
  constructor(private eventBus: EventBus) {
    this.initializeSkills();
  }
  
  private initializeSkills(): void {
    for (const skillType of Object.values(SkillType)) {
      this.skills.set(skillType, {
        type: skillType,
        level: 1,
        experience: 0,
        experienceToNext: this.calculateExperienceToNext(1),
        modifiers: []
      });
    }
  }
  
  gainExperience(skillType: SkillType, amount: number): void {
    const skill = this.skills.get(skillType);
    if (!skill) return;
    
    const multiplier = this.experienceMultipliers.get(skillType) || 1;
    const finalAmount = amount * multiplier;
    
    skill.experience += finalAmount;
    
    // 检查升级
    while (skill.experience >= skill.experienceToNext) {
      this.levelUp(skill);
    }
    
    this.eventBus.emit('skill:experience-gained', {
      skillType,
      amount: finalAmount,
      currentExperience: skill.experience,
      experienceToNext: skill.experienceToNext
    });
  }
  
  private levelUp(skill: Skill): void {
    const excessExperience = skill.experience - skill.experienceToNext;
    skill.level++;
    skill.experience = excessExperience;
    skill.experienceToNext = this.calculateExperienceToNext(skill.level);
    
    // 应用等级奖励
    this.applyLevelBonuses(skill);
    
    this.eventBus.emit('skill:level-up', {
      skillType: skill.type,
      newLevel: skill.level,
      modifiers: skill.modifiers
    });
  }
  
  private calculateExperienceToNext(level: number): number {
    // 指数缩放: base * level^1.5
    return Math.floor(100 * Math.pow(level, 1.5));
  }
  
  private applyLevelBonuses(skill: Skill): void {
    switch (skill.type) {
      case SkillType.COMBAT:
        skill.modifiers.push({
          type: ModifierType.DAMAGE_BONUS,
          value: skill.level * 0.05 // 每级5%
        });
        break;
        
      case SkillType.CRAFTING:
        skill.modifiers.push({
          type: ModifierType.CRAFTING_SPEED,
          value: skill.level * 0.03 // 每级快3%
        });
        break;
        
      case SkillType.GATHERING:
        skill.modifiers.push({
          type: ModifierType.GATHERING_YIELD,
          value: skill.level * 0.02 // 每级多2%产量
        });
        break;
    }
  }
  
  getSkill(skillType: SkillType): Skill | undefined {
    return this.skills.get(skillType);
  }
  
  getSkillLevel(skillType: SkillType): number {
    return this.skills.get(skillType)?.level || 0;
  }
  
  getSkillModifier(skillType: SkillType, modifierType: ModifierType): number {
    const skill = this.skills.get(skillType);
    if (!skill) return 0;
    
    return skill.modifiers
      .filter(m => m.type === modifierType)
      .reduce((total, m) => total + m.value, 0);
  }
}
```

## NPC交互

### 对话系统

带AI集成的动态对话：

```typescript
interface DialogueNode {
  id: string;
  text: string;
  speaker: string;
  emotion: EmotionType;
  responses: DialogueResponse[];
  conditions?: DialogueCondition[];
  effects?: DialogueEffect[];
}

interface DialogueResponse {
  text: string;
  nextNodeId?: string;
  conditions?: DialogueCondition[];
  effects?: DialogueEffect[];
  aiGenerated?: boolean;
}

interface DialogueCondition {
  type: ConditionType;
  parameter: string;
  value: any;
}

interface DialogueEffect {
  type: EffectType;
  parameter: string;
  value: any;
}

class DialogueManager {
  private activeDialogues = new Map<string, ActiveDialogue>();
  private dialogueHistory: DialogueEvent[] = [];
  
  constructor(private aiManager: AIManager, private eventBus: EventBus) {}
  
  async startDialogue(npc: NPC, player: Player): Promise<DialogueSession> {
    const session: DialogueSession = {
      id: generateId(),
      npcId: npc.id,
      playerId: player.id,
      startTime: Date.now(),
      currentNode: null,
      history: [],
      context: this.buildContext(npc, player)
    };
    
    this.activeDialogues.set(session.id, session);
    
    // 从AI或预定义获取初始对话
    const initialMessage = await this.getInitialDialogue(npc, session);
    session.currentNode = initialMessage;
    session.history.push(initialMessage);
    
    this.eventBus.emit('dialogue:started', session);
    
    return session;
  }
  
  async processPlayerResponse(
    sessionId: string, 
    responseText: string
  ): Promise<DialogueResponse> {
    const session = this.activeDialogues.get(sessionId);
    if (!session) {
      throw new Error('对话会话未找到');
    }
    
    // 将玩家回复添加到历史记录
    session.history.push({
      id: generateId(),
      text: responseText,
      speaker: 'player',
      emotion: 'neutral',
      timestamp: Date.now()
    });
    
    // 使用AI生成NPC回复
    const npcResponse = await this.aiManager.requestDialogue(
      session.npcId,
      responseText,
      session.context
    );
    
    // 从AI回复创建对话节点
    const responseNode: DialogueNode = {
      id: generateId(),
      text: npcResponse.text,
      speaker: session.npcId,
      emotion: npcResponse.emotion,
      responses: this.generateResponseOptions(npcResponse),
      timestamp: Date.now()
    };
    
    session.currentNode = responseNode;
    session.history.push(responseNode);
    
    // 应用回复的任何效果
    if (npcResponse.effects) {
      this.applyDialogueEffects(session, npcResponse.effects);
    }
    
    this.eventBus.emit('dialogue:response', {
      sessionId,
      playerResponse: responseText,
      npcResponse: responseNode
    });
    
    return responseNode;
  }
  
  private async getInitialDialogue(npc: NPC, session: DialogueSession): Promise<DialogueNode> {
    // 如果可用，先尝试AI
    if (this.aiManager.isEnabled()) {
      try {
        const aiResponse = await this.aiManager.requestDialogue(npc, 'greeting', session.context);
        return this.createNodeFromAIResponse(aiResponse, npc.id);
      } catch (error) {
        // 回退到预定义对话
        console.warn('AI对话失败，回退到预定义');
      }
    }
    
    // 使用预定义问候语
    return this.getPredefinedGreeting(npc);
  }
  
  private buildContext(npc: NPC, player: Player): DialogueContext {
    return {
      npcName: npc.name,
      npcPersonality: npc.personality,
      npcProfession: npc.profession,
      playerName: player.name,
      playerLevel: player.getLevel(),
      worldTime: this.getWorldTime(),
      weather: this.getCurrentWeather(),
      previousInteractions: this.getInteractionHistory(npc.id, player.id)
    };
  }
}
```

## 世界交互

### 资源采集

资源收集机制：

```typescript
interface ResourceNode {
  id: string;
  type: ResourceType;
  position: Vector2;
  quantity: number;
  maxQuantity: number;
  regenerationRate: number;
  requiredTool?: ToolType;
  requiredSkill?: SkillType;
  minimumSkillLevel?: number;
}

enum ResourceType {
  WOOD = 'wood',
  STONE = 'stone',
  ORE = 'ore',
  HERB = 'herb',
  FOOD = 'food',
  WATER = 'water'
}

class ResourceGathering {
  private resourceNodes = new Map<string, ResourceNode>();
  private gatheringSessions = new Map<string, GatheringSession>();
  
  constructor(private inventory: InventoryManager, private skillManager: SkillManager) {}
  
  async startGathering(
    player: Player,
    resourceNode: ResourceNode,
    tool: Tool | null
  ): Promise<GatheringResult> {
    // 检查需求
    const check = this.checkGatheringRequirements(player, resourceNode, tool);
    if (!check.canGather) {
      return { success: false, reason: check.reason };
    }
    
    // 检查节点是否耗尽
    if (resourceNode.quantity <= 0) {
      return { success: false, reason: 'resource_depleted' };
    }
    
    // 计算采集参数
    const gatheringTime = this.calculateGatheringTime(player, resourceNode, tool);
    const yieldAmount = this.calculateYield(player, resourceNode, tool);
    
    const session: GatheringSession = {
      playerId: player.id,
      resourceNodeId: resourceNode.id,
      startTime: Date.now(),
      duration: gatheringTime,
      expectedYield: yieldAmount,
      toolUsed: tool?.id
    };
    
    this.gatheringSessions.set(player.id, session);
    
    // 开始采集过程
    this.processGathering(session);
    
    return {
      success: true,
      session,
      estimatedCompletion: Date.now() + gatheringTime
    };
  }
  
  private checkGatheringRequirements(
    player: Player,
    node: ResourceNode,
    tool: Tool | null
  ): RequirementCheck {
    // 检查工具需求
    if (node.requiredTool) {
      if (!tool || tool.type !== node.requiredTool) {
        return { canGather: false, reason: 'wrong_tool' };
      }
    }
    
    // 检查技能需求
    if (node.requiredSkill && node.minimumSkillLevel) {
      const skillLevel = this.skillManager.getSkillLevel(node.requiredSkill);
      if (skillLevel < node.minimumSkillLevel) {
        return { 
          canGather: false, 
          reason: 'insufficient_skill',
          requiredLevel: node.minimumSkillLevel,
          currentLevel: skillLevel
        };
      }
    }
    
    return { canGather: true };
  }
  
  private calculateGatheringTime(
    player: Player,
    node: ResourceNode,
    tool: Tool | null
  ): number {
    let baseTime = 3000; // 3秒基础
    
    // 工具效率奖励
    if (tool) {
      baseTime *= 1 - (tool.power * 0.1); // 每工具强度快10%
    }
    
    // 技能奖励
    if (node.requiredSkill) {
      const skillLevel = this.skillManager.getSkillLevel(node.requiredSkill);
      baseTime *= 1 - (skillLevel * 0.02); // 每技能等级快2%
    }
    
    return Math.max(1000, baseTime); // 最少1秒
  }
  
  private calculateYield(
    player: Player,
    node: ResourceNode,
    tool: Tool | null
  ): number {
    let baseYield = 1;
    
    // 工具产量奖励
    if (tool) {
      baseYield += Math.floor(tool.power * 0.2); // 每强度20%几率
    }
    
    // 技能产量奖励
    if (node.requiredSkill) {
      const skillLevel = this.skillManager.getSkillLevel(node.requiredSkill);
      const skillBonus = this.skillManager.getSkillModifier(
        node.requiredSkill,
        ModifierType.GATHERING_YIELD
      );
      baseYield += skillBonus;
    }
    
    // 随机变化
    const variation = Math.random() * 0.3 - 0.15; // ±15%
    return Math.max(1, Math.floor(baseYield * (1 + variation)));
  }
  
  private async processGathering(session: GatheringSession): Promise<void> {
    await this.delay(session.duration);
    
    const node = this.resourceNodes.get(session.resourceNodeId);
    if (!node) return;
    
    // 计算实际产量（如果节点耗尽可能会减少）
    const actualYield = Math.min(session.expectedYield, node.quantity);
    
    // 创建采集到的物品
    const gatheredItem = this.createResourceItem(node.type, actualYield);
    
    // 添加到背包
    this.inventory.addItem(gatheredItem, actualYield);
    
    // 减少节点数量
    node.quantity -= actualYield;
    
    // 授予经验
    if (node.requiredSkill) {
      const expGained = actualYield * 10; // 每件物品10经验
      this.skillManager.gainExperience(node.requiredSkill, expGained);
    }
    
    // 清理会话
    this.gatheringSessions.delete(session.playerId);
    
    // 发出成功事件
    this.eventBus.emit('gathering:completed', {
      session,
      actualYield,
      remainingQuantity: node.quantity
    });
  }
}
```

## 昼夜循环

### 时间管理

影响游戏玩法的动态时间系统：

```typescript
class DayNightCycle {
  private currentTime = 6; // 从早上6点开始
  private dayLength = 20; // 20分钟实时 = 24小时游戏时间
  private isPaused = false;
  private lastUpdate = Date.now();
  
  constructor(private eventBus: EventBus) {}
  
  update(): void {
    if (this.isPaused) return;
    
    const now = Date.now();
    const deltaMs = now - this.lastUpdate;
    this.lastUpdate = now;
    
    // 将实时转换为游戏时间
    const gameHoursPerRealSecond = 24 / (this.dayLength * 60);
    const timeChange = (deltaMs / 1000) * gameHoursPerRealSecond;
    
    this.currentTime += timeChange;
    
    // 处理日期循环
    if (this.currentTime >= 24) {
      this.currentTime -= 24;
      this.eventBus.emit('time:new-day', {
        day: Math.floor(this.currentTime / 24) + 1
      });
    }
    
    // 检查基于时间的事件
    this.checkTimeEvents();
  }
  
  private checkTimeEvents(): void {
    const previousHour = Math.floor(this.currentTime - 0.1);
    const currentHour = Math.floor(this.currentTime);
    
    if (previousHour !== currentHour) {
      this.eventBus.emit('time:hour-changed', {
        previousHour,
        currentHour,
        timeOfDay: this.getTimeOfDay()
      });
      
      // 检查特定时间
      if (currentHour === 6) {
        this.eventBus.emit('time:sunrise');
      } else if (currentHour === 18) {
        this.eventBus.emit('time:sunset');
      } else if (currentHour === 0) {
        this.eventBus.emit('time:midnight');
      }
    }
  }
  
  getTimeOfDay(): TimeOfDay {
    if (this.currentTime >= 5 && this.currentTime < 7) {
      return 'dawn';
    } else if (this.currentTime >= 7 && this.currentTime < 12) {
      return 'morning';
    } else if (this.currentTime >= 12 && this.currentTime < 17) {
      return 'afternoon';
    } else if (this.currentTime >= 17 && this.currentTime < 19) {
      return 'evening';
    } else if (this.currentTime >= 19 && this.currentTime < 21) {
      return 'dusk';
    } else {
      return 'night';
    }
  }
  
  getLightLevel(): number {
    const timeOfDay = this.getTimeOfDay();
    const lightLevels = {
      dawn: 0.3,
      morning: 1.0,
      afternoon: 1.0,
      evening: 0.7,
      dusk: 0.2,
      night: 0.1
    };
    
    return lightLevels[timeOfDay];
  }
  
  getCurrentTime(): number {
    return this.currentTime;
  }
  
  setTime(hour: number): void {
    this.currentTime = MathUtils.clamp(hour, 0, 24);
  }
  
  getTimeString(): string {
    const hours = Math.floor(this.currentTime);
    const minutes = Math.floor((this.currentTime - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
}
```

## 天气系统

### 动态天气

对游戏玩法产生影响的天气效果：

```typescript
enum WeatherType {
  CLEAR = 'clear',
  RAIN = 'rain',
  STORM = 'storm',
  SNOW = 'snow',
  FOG = 'fog'
}

interface WeatherEffect {
  type: WeatherType;
  movementSpeedModifier: number;
  visibilityModifier: number;
  gatheringModifier: number;
  combatModifier: number;
  resourceSpawns: ResourceSpawnModifier[];
}

class WeatherManager {
  private currentWeather: WeatherType = WeatherType.CLEAR;
  private weatherIntensity = 1.0;
  private weatherDuration = 0;
  private nextWeatherChange = 0;
  private transitionProgress = 0;
  
  private weatherEffects: Map<WeatherType, WeatherEffect> = new Map();
  
  constructor(private eventBus: EventBus) {
    this.initializeWeatherEffects();
  }
  
  private initializeWeatherEffects(): void {
    this.weatherEffects.set(WeatherType.CLEAR, {
      type: WeatherType.CLEAR,
      movementSpeedModifier: 1.0,
      visibilityModifier: 1.0,
      gatheringModifier: 1.0,
      combatModifier: 1.0,
      resourceSpawns: []
    });
    
    this.weatherEffects.set(WeatherType.RAIN, {
      type: WeatherType.RAIN,
      movementSpeedModifier: 0.9,
      visibilityModifier: 0.8,
      gatheringModifier: 0.8,
      combatModifier: 0.95,
      resourceSpawns: [
        { resourceType: ResourceType.HERB, spawnRate: 1.2 }
      ]
    });
    
    this.weatherEffects.set(WeatherType.STORM, {
      type: WeatherType.STORM,
      movementSpeedModifier: 0.7,
      visibilityModifier: 0.5,
      gatheringModifier: 0.5,
      combatModifier: 0.8,
      resourceSpawns: [
        { resourceType: ResourceType.WATER, spawnRate: 2.0 }
      ]
    });
  }
  
  update(deltaMs: number): void {
    this.checkWeatherChange();
    this.updateTransition(deltaMs);
  }
  
  private checkWeatherChange(): void {
    if (Date.now() >= this.nextWeatherChange) {
      this.changeWeather();
    }
  }
  
  private changeWeather(): void {
    const availableWeathers = Object.values(WeatherType);
    const newWeather = this.selectWeightedWeather(availableWeathers);
    
    if (newWeather !== this.currentWeather) {
      this.startWeatherTransition(newWeather);
    }
    
    // 安排下次变化
    this.scheduleNextWeatherChange();
  }
  
  private selectWeightedWeather(weathers: WeatherType[]): WeatherType {
    // 给晴天更高的权重
    const weights = weathers.map(weather => {
      if (weather === WeatherType.CLEAR) return 0.6;
      if (weather === WeatherType.RAIN) return 0.25;
      if (weather === WeatherType.STORM) return 0.1;
      return 0.05;
    });
    
    return this.weightedRandom(weathers, weights);
  }
  
  private startWeatherTransition(newWeather: WeatherType): void {
    this.transitionProgress = 0;
    
    this.eventBus.emit('weather:changing', {
      from: this.currentWeather,
      to: newWeather,
      intensity: this.weatherIntensity
    });
    
    // 在10秒内逐渐过渡
    const transitionDuration = 10000;
    const startTime = Date.now();
    
    const transition = setInterval(() => {
      const elapsed = Date.now() - startTime;
      this.transitionProgress = Math.min(1, elapsed / transitionDuration);
      
      if (this.transitionProgress >= 1) {
        this.currentWeather = newWeather;
        clearInterval(transition);
        
        this.eventBus.emit('weather:changed', {
          newWeather: newWeather,
          intensity: this.weatherIntensity
        });
      }
    }, 100);
  }
  
  getCurrentWeatherEffect(): WeatherEffect {
    return this.weatherEffects.get(this.currentWeather)!;
  }
  
  getMovementSpeedModifier(): number {
    const effect = this.getCurrentWeatherEffect();
    return effect.movementSpeedModifier;
  }
  
  getVisibilityModifier(): number {
    const effect = this.getCurrentWeatherEffect();
    return effect.visibilityModifier;
  }
  
  getGatheringModifier(): number {
    const effect = this.getCurrentWeatherEffect();
    return effect.gatheringModifier;
  }
  
  getCombatModifier(): number {
    const effect = this.getCurrentWeatherEffect();
    return effect.combatModifier;
  }
}
```

## 经济系统

### 交易系统

动态定价和交易机制：

```typescript
interface MarketData {
  itemId: string;
  basePrice: number;
  currentPrice: number;
  demand: number; // 0-1
  supply: number; // 0-1
  priceHistory: PricePoint[];
  volatility: number;
}

interface PricePoint {
  price: number;
  timestamp: number;
  demand: number;
  supply: number;
}

class EconomyManager {
  private markets = new Map<string, MarketData>();
  private merchants = new Map<string, Merchant>();
  private globalEvents: EconomicEvent[] = [];
  
  constructor(private eventBus: EventBus) {
    this.initializeMarkets();
  }
  
  private initializeMarkets(): void {
    // 为常见物品初始化基础市场数据
    const commonItems = [
      { id: 'wood', basePrice: 5 },
      { id: 'stone', basePrice: 8 },
      { id: 'iron_ore', basePrice: 15 },
      { id: 'health_potion', basePrice: 25 },
      { id: 'bread', basePrice: 10 }
    ];
    
    for (const item of commonItems) {
      this.markets.set(item.id, {
        itemId: item.id,
        basePrice: item.basePrice,
        currentPrice: item.basePrice,
        demand: 0.5,
        supply: 0.5,
        priceHistory: [],
        volatility: 0.1
      });
    }
  }
  
  calculatePrice(itemId: string, quantity: number, seller: Merchant): TradeResult {
    const market = this.markets.get(itemId);
    if (!market) {
      return { success: false, reason: 'item_not_traded' };
    }
    
    // 基础价格计算
    let price = market.currentPrice * quantity;
    
    // 应用商人加价/折扣
    const merchantModifier = seller.getPriceModifier(itemId);
    price *= merchantModifier;
    
    // 应用声望奖励
    const reputationBonus = this.calculateReputationBonus(seller, itemId);
    price *= reputationBonus;
    
    // 四舍五入到最接近的整数
    price = Math.round(price);
    
    return {
      success: true,
      price,
      unitPrice: price / quantity,
      reputationBonus,
      merchantModifier
    };
  }
  
  private calculateReputationBonus(merchant: Merchant, itemId: string): number {
    const reputation = merchant.getReputation();
    const itemPreference = merchant.getItemPreference(itemId);
    
    // 更好的声望 = 更好的价格
    const reputationFactor = 1 - (reputation * 0.1); // 最多10%折扣
    const preferenceFactor = 1 - (itemPreference * 0.05); // 喜欢的物品最多5%
    
    return reputationFactor * preferenceFactor;
  }
  
  updateMarket(itemId: string, demandChange: number, supplyChange: number): void {
    const market = this.markets.get(itemId);
    if (!market) return;
    
    // 更新需求和供应
    market.demand = MathUtils.clamp(market.demand + demandChange, 0, 1);
    market.supply = MathUtils.clamp(market.supply + supplyChange, 0, 1);
    
    // 根据需求/供应计算新价格
    const demandFactor = 1 + (market.demand - 0.5) * market.volatility;
    const supplyFactor = 1 - (market.supply - 0.5) * market.volatility;
    
    market.currentPrice = Math.round(
      market.basePrice * demandFactor * supplyFactor
    );
    
    // 记录价格历史
    market.priceHistory.push({
      price: market.currentPrice,
      timestamp: Date.now(),
      demand: market.demand,
      supply: market.supply
    });
    
    // 只保留最近100个价格点
    if (market.priceHistory.length > 100) {
      market.priceHistory.shift();
    }
    
    this.eventBus.emit('economy:price-changed', {
      itemId,
      newPrice: market.currentPrice,
      demand: market.demand,
      supply: market.supply
    });
  }
  
  getMarketTrend(itemId: string): MarketTrend {
    const market = this.markets.get(itemId);
    if (!market || market.priceHistory.length < 2) {
      return 'stable';
    }
    
    const recent = market.priceHistory.slice(-10);
    const older = market.priceHistory.slice(-20, -10);
    
    const recentAvg = recent.reduce((sum, p) => sum + p.price, 0) / recent.length;
    const olderAvg = older.reduce((sum, p) => sum + p.price, 0) / older.length;
    
    const changePercent = (recentAvg - olderAvg) / olderAvg;
    
    if (changePercent > 0.1) return 'rising';
    if (changePercent < -0.1) return 'falling';
    return 'stable';
  }
}
```

## 任务系统

### 任务管理

动态任务生成和跟踪：

```typescript
interface Quest {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  difficulty: QuestDifficulty;
  objectives: QuestObjective[];
  rewards: QuestReward[];
  prerequisites?: string[];
  timeLimit?: number;
  repeatable: boolean;
}

interface QuestObjective {
  id: string;
  description: string;
  type: ObjectiveType;
  target: string;
  current: number;
  required: number;
  completed: boolean;
}

enum QuestType {
  MAIN = 'main',
  SIDE = 'side',
  DAILY = 'daily',
  REPEATABLE = 'repeatable',
  EVENT = 'event'
}

class QuestManager {
  private activeQuests = new Map<string, ActiveQuest>();
  private completedQuests = new Set<string>();
  private questTemplates: Map<string, QuestTemplate> = new Map();
  
  constructor(private eventBus: EventBus) {
    this.initializeQuestTemplates();
  }
  
  acceptQuest(playerId: string, questId: string): QuestResult {
    // 检查任务是否已激活
    if (this.hasActiveQuest(playerId, questId)) {
      return { success: false, reason: 'quest_already_active' };
    }
    
    // 检查任务是否已完成且不可重复
    const quest = this.getQuest(questId);
    if (!quest) {
      return { success: false, reason: 'quest_not_found' };
    }
    
    if (this.completedQuests.has(questId) && !quest.repeatable) {
      return { success: false, reason: 'quest_already_completed' };
    }
    
    // 检查先决条件
    if (quest.prerequisites) {
      for (const prereq of quest.prerequisites) {
        if (!this.completedQuests.has(prereq)) {
          return { success: false, reason: 'missing_prerequisites' };
        }
      }
    }
    
    // 创建激活任务
    const activeQuest: ActiveQuest = {
      questId,
      playerId,
      startTime: Date.now(),
      objectives: quest.objectives.map(obj => ({ ...obj })),
      progress: 0,
      status: 'active'
    };
    
    this.activeQuests.set(this.getQuestKey(playerId, questId), activeQuest);
    
    this.eventBus.emit('quest:accepted', {
      playerId,
      questId,
      questTitle: quest.title
    });
    
    return { success: true, quest: activeQuest };
  }
  
  updateObjective(
    playerId: string,
    objectiveType: ObjectiveType,
    target: string,
    progress: number
  ): void {
    // 找到此玩家的所有激活任务
    for (const [key, activeQuest] of this.activeQuests) {
      if (activeQuest.playerId !== playerId) continue;
      
      // 更新匹配的目标
      let questUpdated = false;
      for (const objective of activeQuest.objectives) {
        if (objective.type === objectiveType && objective.target === target) {
          objective.current = Math.min(objective.required, objective.current + progress);
          objective.completed = objective.current >= objective.required;
          questUpdated = true;
        }
      }
      
      if (questUpdated) {
        this.checkQuestCompletion(activeQuest);
        
        this.eventBus.emit('quest:objective-updated', {
          playerId,
          questId: activeQuest.questId,
          objectives: activeQuest.objectives
        });
      }
    }
  }
  
  private checkQuestCompletion(activeQuest: ActiveQuest): void {
    const allCompleted = activeQuest.objectives.every(obj => obj.completed);
    
    if (allCompleted && activeQuest.status === 'active') {
      activeQuest.status = 'completed';
      activeQuest.completionTime = Date.now();
      
      this.eventBus.emit('quest:completed', {
        playerId: activeQuest.playerId,
        questId: activeQuest.questId
      });
      
      // 如果配置为自动领取奖励
      this.autoClaimRewards(activeQuest);
    }
  }
  
  completeQuest(playerId: string, questId: string): QuestCompletionResult {
    const key = this.getQuestKey(playerId, questId);
    const activeQuest = this.activeQuests.get(key);
    
    if (!activeQuest) {
      return { success: false, reason: 'quest_not_found' };
    }
    
    if (activeQuest.status !== 'completed') {
      return { success: false, reason: 'quest_not_completed' };
    }
    
    const quest = this.getQuest(questId)!;
    
    // 授予奖励
    const rewardsGranted = this.grantRewards(playerId, quest.rewards);
    
    // 标记为已完成
    this.completedQuests.add(questId);
    this.activeQuests.delete(key);
    
    this.eventBus.emit('quest:reward-claimed', {
      playerId,
      questId,
      rewards: rewardsGranted
    });
    
    return {
      success: true,
      rewards: rewardsGranted,
      experienceGained: this.calculateExperience(quest)
    };
  }
}
```

## 进阶系统

### 角色进阶

带技能树的等级进阶：

```typescript
interface ProgressionTree {
  combat: ProgressionBranch;
  magic: ProgressionBranch;
  crafting: ProgressionBranch;
  exploration: ProgressionBranch;
  social: ProgressionBranch;
}

interface ProgressionBranch {
  nodes: ProgressionNode[];
  connections: NodeConnection[];
}

interface ProgressionNode {
  id: string;
  name: string;
  description: string;
  tier: number;
  cost: number;
  prerequisites: string[];
  bonuses: ProgressionBonus[];
  unlocked: boolean;
  purchased: boolean;
}

class ProgressionManager {
  private progressionTrees = new Map<string, ProgressionTree>();
  private playerProgression = new Map<string, PlayerProgression>();
  
  constructor(private eventBus: EventBus) {
    this.initializeProgressionTrees();
  }
  
  unlockNode(playerId: string, treeId: string, nodeId: string): ProgressionResult {
    const progression = this.getPlayerProgression(playerId);
    const tree = this.progressionTrees.get(treeId);
    const node = this.findNode(tree, nodeId);
    
    if (!node) {
      return { success: false, reason: 'node_not_found' };
    }
    
    if (node.purchased) {
      return { success: false, reason: 'node_already_purchased' };
    }
    
    // 检查先决条件
    for (const prereq of node.prerequisites) {
      const prereqNode = this.findNode(tree, prereq);
      if (!prereqNode || !prereqNode.purchased) {
        return { success: false, reason: 'missing_prerequisites' };
      }
    }
    
    // 检查成本
    if (progression.points < node.cost) {
      return { success: false, reason: 'insufficient_points' };
    }
    
    // 购买节点
    progression.points -= node.cost;
    node.purchased = true;
    
    // 应用奖励
    this.applyBonuses(playerId, node.bonuses);
    
    this.eventBus.emit('progression:node-unlocked', {
      playerId,
      treeId,
      nodeId,
      bonuses: node.bonuses
    });
    
    return { success: true, node, remainingPoints: progression.points };
  }
  
  private applyBonuses(playerId: string, bonuses: ProgressionBonus[]): void {
    for (const bonus of bonuses) {
      switch (bonus.type) {
        case 'attribute_bonus':
          this.applyAttributeBonus(playerId, bonus);
          break;
        case 'skill_bonus':
          this.applySkillBonus(playerId, bonus);
          break;
        case 'crafting_bonus':
          this.applyCraftingBonus(playerId, bonus);
          break;
        case 'combat_bonus':
          this.applyCombatBonus(playerId, bonus);
          break;
      }
    }
  }
  
  getTotalBonus(playerId: string, bonusType: string): number {
    const progression = this.getPlayerProgression(playerId);
    let total = 0;
    
    for (const [treeId, tree] of this.progressionTrees) {
      for (const node of this.getAllNodes(tree)) {
        if (node.purchased) {
          for (const bonus of node.bonuses) {
            if (bonus.type === bonusType) {
              total += bonus.value;
            }
          }
        }
      }
    }
    
    return total;
  }
}
```

## 游戏平衡

### 平衡配置

集中化的游戏平衡设置：

```typescript
interface GameBalance {
  player: PlayerBalance;
  combat: CombatBalance;
  economy: EconomyBalance;
  progression: ProgressionBalance;
  ai: AIBalance;
}

interface PlayerBalance {
  baseHealth: number;
  healthPerLevel: number;
  baseStamina: number;
  staminaRegenRate: number;
  movementSpeed: number;
  jumpHeight: number;
}

interface CombatBalance {
  baseDamage: number;
  damagePerStrength: number;
  defensePerVitality: number;
  criticalChance: number;
  criticalMultiplier: number;
  damageReductionFormula: string;
}

class GameBalanceManager {
  private balance: GameBalance;
  private difficulty: DifficultyLevel;
  
  constructor() {
    this.difficulty = DifficultyLevel.NORMAL;
    this.loadBalanceConfiguration();
  }
  
  private loadBalanceConfiguration(): void {
    this.balance = {
      player: {
        baseHealth: 100,
        healthPerLevel: 10,
        baseStamina: 50,
        staminaRegenRate: 2,
        movementSpeed: 5,
        jumpHeight: 12
      },
      combat: {
        baseDamage: 10,
        damagePerStrength: 1.5,
        defensePerVitality: 1.0,
        criticalChance: 0.1,
        criticalMultiplier: 1.5,
        damageReductionFormula: 'defense / (defense + 100)'
      },
      economy: {
        baseInflationRate: 0.02,
        priceVolatility: 0.1,
        merchantMarkup: 1.2,
        playerDiscount: 0.9
      },
      progression: {
        experienceMultiplier: 1.0,
        skillPointGainRate: 1,
        unlockRequirementMultiplier: 1.0
      },
      ai: {
        behaviorUpdateInterval: 3000,
        dialogueCooldown: 5000,
        decisionComplexity: 'medium'
      }
    };
    
    // 应用难度修正
    this.applyDifficultyModifiers();
  }
  
  private applyDifficultyModifiers(): void {
    const modifiers = this.getDifficultyModifiers(this.difficulty);
    
    // 应用到所有平衡类别
    this.balance.player.baseHealth *= modifiers.playerHealth;
    this.balance.combat.baseDamage *= modifiers.combatDamage;
    this.balance.economy.merchantMarkup *= modifiers.economyMultiplier;
    this.balance.progression.experienceMultiplier *= modifiers.experienceMultiplier;
  }
  
  getBalance(): GameBalance {
    return this.balance;
  }
  
  updateBalance(category: string, key: string, value: number): void {
    if (this.balance[category]) {
      this.balance[category][key] = value;
    }
  }
  
  resetBalance(): void {
    this.loadBalanceConfiguration();
  }
}
```

## 相关文档

- [完整开发指南](development-guide-zh.md) - 综合开发指南
- [架构概览](architecture-zh.md) - 系统设计和组件交互
- [API参考](api-reference-zh.md) - 完整API文档
- [性能优化](performance-zh.md) - 优化策略和基准
- [AI行为系统](ai-behavior-zh.md) - NPC智能和决策制定
- [世界生成](world-generation-zh.md) - 程序化生成算法

---

*更多信息，请访问 [Quantelix AI](https://quantelixai.com/) 和 [Nebulix AI](https://nebulix.quantelixai.com)*