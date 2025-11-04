# Game Mechanics

Comprehensive documentation of core gameplay systems in the Quantelix AI Game Engine.

## Table of Contents
- [Core Game Systems](#core-game-systems)
- [Player Mechanics](#player-mechanics)
- [Combat System](#combat-system)
- [Inventory System](#inventory-system)
- [Crafting System](#crafting-system)
- [Skill System](#skill-system)
- [NPC Interactions](#npc-interactions)
- [World Interactions](#world-interactions)
- [Day/Night Cycle](#daynight-cycle)
- [Weather System](#weather-system)
- [Economy System](#economy-system)
- [Quest System](#quest-system)
- [Progression System](#progression-system)
- [Game Balance](#game-balance)
- [Related Documentation](#related-documentation)

## Core Game Systems

### System Architecture

The game mechanics are built on a modular system architecture:

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

### Game State Manager

Central manager for all game mechanics:

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

## Player Mechanics

### Player Attributes

Core player statistics and attributes:

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
  
  // Primary attributes
  strength: number;
  agility: number;
  intelligence: number;
  vitality: number;
  wisdom: number;
  charisma: number;
}
```

### Player Movement

Movement mechanics with physics integration:

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
    // Apply friction
    this.velocity.x *= this.friction;
    
    // Apply gravity
    if (!this.isGrounded) {
      this.velocity.y += 0.5; // Gravity
    }
    
    // Clamp velocity
    this.velocity.x = MathUtils.clamp(this.velocity.x, -this.maxSpeed, this.maxSpeed);
    this.velocity.y = MathUtils.clamp(this.velocity.y, -20, 20);
  }
  
  private updatePosition(): void {
    const body = this.player.getBody();
    Matter.Body.setVelocity(body, this.velocity);
  }
}
```

### Player Health System

Health management with regeneration:

```typescript
class PlayerHealth {
  private health: number;
  private maxHealth: number;
  private regenerationRate = 0.1; // per second
  private lastDamageTime = 0;
  private regenerationDelay = 5000; // 5 seconds after damage
  
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

## Combat System

### Combat Mechanics

Core combat system with damage calculation:

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
    
    // Damage formula: damage = base * (1 - defense/(defense + 100))
    const effectiveDamage = baseDamage * (1 - defense / (defense + 100));
    
    // Critical hit calculation
    const isCritical = Math.random() < attacker.getCriticalChance();
    const multiplier = isCritical ? attacker.getCriticalMultiplier() : 1;
    
    return Math.floor(effectiveDamage * multiplier);
  }
  
  private applyDamage(target: Combatant, damage: number): { damage: number; critical: boolean } {
    const isCritical = Math.random() < 0.1; // 10% base critical chance
    const finalDamage = isCritical ? damage * 1.5 : damage;
    
    target.takeDamage(finalDamage);
    
    return { damage: finalDamage, critical: isCritical };
  }
  
  private logCombatEvent(event: CombatEvent): void {
    this.combatLog.push(event);
    
    // Keep only last 100 events
    if (this.combatLog.length > 100) {
      this.combatLog.shift();
    }
    
    this.eventBus.emit('combat:event', event);
  }
}
```

### Weapon System

Weapon mechanics and properties:

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
    // Apply durability penalty
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

## Inventory System

### Inventory Management

Item storage and management:

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
    // Try to stack with existing items first
    const stackableSlot = this.findStackableSlot(item);
    if (stackableSlot !== -1) {
      const slot = this.slots[stackableSlot];
      const canAdd = Math.min(quantity, slot.maxStack - slot.quantity);
      slot.quantity += canAdd;
      
      if (canAdd < quantity) {
        // Add remaining to new slot
        return this.addItemToNewSlot(item, quantity - canAdd);
      }
      
      this.eventBus.emit('inventory:item-added', { item, quantity: canAdd });
      return true;
    }
    
    // Add to new slot
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

### Item System

Item definitions and properties:

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
  
  // Type-specific properties
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

## Crafting System

### Crafting Recipes

Recipe-based crafting system:

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
  alternatives?: string[]; // Alternative items that can be used
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
    
    // Check ingredients
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
    
    // Check tools
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
    
    // Check crafting station
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
    
    // Consume ingredients
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
    
    // Add result to inventory
    this.inventory.addItem(recipe.result, recipe.quantity);
    
    // Grant crafting experience
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

## Skill System

### Skill Progression

Skill-based progression system:

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
    
    // Check for level up
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
    
    // Apply level bonuses
    this.applyLevelBonuses(skill);
    
    this.eventBus.emit('skill:level-up', {
      skillType: skill.type,
      newLevel: skill.level,
      modifiers: skill.modifiers
    });
  }
  
  private calculateExperienceToNext(level: number): number {
    // Exponential scaling: base * level^1.5
    return Math.floor(100 * Math.pow(level, 1.5));
  }
  
  private applyLevelBonuses(skill: Skill): void {
    switch (skill.type) {
      case SkillType.COMBAT:
        skill.modifiers.push({
          type: ModifierType.DAMAGE_BONUS,
          value: skill.level * 0.05 // 5% per level
        });
        break;
        
      case SkillType.CRAFTING:
        skill.modifiers.push({
          type: ModifierType.CRAFTING_SPEED,
          value: skill.level * 0.03 // 3% faster per level
        });
        break;
        
      case SkillType.GATHERING:
        skill.modifiers.push({
          type: ModifierType.GATHERING_YIELD,
          value: skill.level * 0.02 // 2% more yield per level
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

## NPC Interactions

### Dialogue System

Dynamic dialogue with AI integration:

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
    
    // Get initial dialogue from AI or predefined
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
      throw new Error('Dialogue session not found');
    }
    
    // Add player response to history
    session.history.push({
      id: generateId(),
      text: responseText,
      speaker: 'player',
      emotion: 'neutral',
      timestamp: Date.now()
    });
    
    // Generate NPC response using AI
    const npcResponse = await this.aiManager.requestDialogue(
      session.npcId,
      responseText,
      session.context
    );
    
    // Create dialogue node from AI response
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
    
    // Apply any effects from the response
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
    // Try AI first if available
    if (this.aiManager.isEnabled()) {
      try {
        const aiResponse = await this.aiManager.requestDialogue(npc, 'greeting', session.context);
        return this.createNodeFromAIResponse(aiResponse, npc.id);
      } catch (error) {
        // Fallback to predefined dialogue
        console.warn('AI dialogue failed, falling back to predefined');
      }
    }
    
    // Use predefined greeting
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

## World Interactions

### Resource Gathering

Resource collection mechanics:

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
    // Check requirements
    const check = this.checkGatheringRequirements(player, resourceNode, tool);
    if (!check.canGather) {
      return { success: false, reason: check.reason };
    }
    
    // Check if node is depleted
    if (resourceNode.quantity <= 0) {
      return { success: false, reason: 'resource_depleted' };
    }
    
    // Calculate gathering parameters
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
    
    // Start gathering process
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
    // Check tool requirement
    if (node.requiredTool) {
      if (!tool || tool.type !== node.requiredTool) {
        return { canGather: false, reason: 'wrong_tool' };
      }
    }
    
    // Check skill requirement
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
    let baseTime = 3000; // 3 seconds base
    
    // Tool efficiency bonus
    if (tool) {
      baseTime *= 1 - (tool.power * 0.1); // 10% faster per tool power
    }
    
    // Skill bonus
    if (node.requiredSkill) {
      const skillLevel = this.skillManager.getSkillLevel(node.requiredSkill);
      baseTime *= 1 - (skillLevel * 0.02); // 2% faster per skill level
    }
    
    return Math.max(1000, baseTime); // Minimum 1 second
  }
  
  private calculateYield(
    player: Player,
    node: ResourceNode,
    tool: Tool | null
  ): number {
    let baseYield = 1;
    
    // Tool yield bonus
    if (tool) {
      baseYield += Math.floor(tool.power * 0.2); // 20% chance per power
    }
    
    // Skill yield bonus
    if (node.requiredSkill) {
      const skillLevel = this.skillManager.getSkillLevel(node.requiredSkill);
      const skillBonus = this.skillManager.getSkillModifier(
        node.requiredSkill,
        ModifierType.GATHERING_YIELD
      );
      baseYield += skillBonus;
    }
    
    // Random variation
    const variation = Math.random() * 0.3 - 0.15; // ±15%
    return Math.max(1, Math.floor(baseYield * (1 + variation)));
  }
  
  private async processGathering(session: GatheringSession): Promise<void> {
    await this.delay(session.duration);
    
    const node = this.resourceNodes.get(session.resourceNodeId);
    if (!node) return;
    
    // Calculate actual yield (may be less if node is depleted)
    const actualYield = Math.min(session.expectedYield, node.quantity);
    
    // Create gathered item
    const gatheredItem = this.createResourceItem(node.type, actualYield);
    
    // Add to inventory
    this.inventory.addItem(gatheredItem, actualYield);
    
    // Reduce node quantity
    node.quantity -= actualYield;
    
    // Grant experience
    if (node.requiredSkill) {
      const expGained = actualYield * 10; // 10 XP per item
      this.skillManager.gainExperience(node.requiredSkill, expGained);
    }
    
    // Clean up session
    this.gatheringSessions.delete(session.playerId);
    
    // Emit success event
    this.eventBus.emit('gathering:completed', {
      session,
      actualYield,
      remainingQuantity: node.quantity
    });
  }
}
```

## Day/Night Cycle

### Time Management

Dynamic time system affecting gameplay:

```typescript
class DayNightCycle {
  private currentTime = 6; // Start at 6 AM
  private dayLength = 20; // 20 minutes real time = 24 hours game time
  private isPaused = false;
  private lastUpdate = Date.now();
  
  constructor(private eventBus: EventBus) {}
  
  update(): void {
    if (this.isPaused) return;
    
    const now = Date.now();
    const deltaMs = now - this.lastUpdate;
    this.lastUpdate = now;
    
    // Convert real time to game time
    const gameHoursPerRealSecond = 24 / (this.dayLength * 60);
    const timeChange = (deltaMs / 1000) * gameHoursPerRealSecond;
    
    this.currentTime += timeChange;
    
    // Handle day wrap
    if (this.currentTime >= 24) {
      this.currentTime -= 24;
      this.eventBus.emit('time:new-day', {
        day: Math.floor(this.currentTime / 24) + 1
      });
    }
    
    // Check for time-based events
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
      
      // Check for specific times
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

## Weather System

### Dynamic Weather

Weather effects on gameplay:

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
    
    // Schedule next change
    this.scheduleNextWeatherChange();
  }
  
  private selectWeightedWeather(weathers: WeatherType[]): WeatherType {
    // Weight clear weather more heavily
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
    
    // Gradually transition over 10 seconds
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

## Economy System

### Trading System

Dynamic pricing and trading mechanics:

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
    // Initialize base market data for common items
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
    
    // Base price calculation
    let price = market.currentPrice * quantity;
    
    // Apply merchant markup/discount
    const merchantModifier = seller.getPriceModifier(itemId);
    price *= merchantModifier;
    
    // Apply reputation bonus
    const reputationBonus = this.calculateReputationBonus(seller, itemId);
    price *= reputationBonus;
    
    // Round to nearest integer
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
    
    // Better reputation = better prices
    const reputationFactor = 1 - (reputation * 0.1); // Up to 10% discount
    const preferenceFactor = 1 - (itemPreference * 0.05); // Up to 5% for liked items
    
    return reputationFactor * preferenceFactor;
  }
  
  updateMarket(itemId: string, demandChange: number, supplyChange: number): void {
    const market = this.markets.get(itemId);
    if (!market) return;
    
    // Update demand and supply
    market.demand = MathUtils.clamp(market.demand + demandChange, 0, 1);
    market.supply = MathUtils.clamp(market.supply + supplyChange, 0, 1);
    
    // Calculate new price based on demand/supply
    const demandFactor = 1 + (market.demand - 0.5) * market.volatility;
    const supplyFactor = 1 - (market.supply - 0.5) * market.volatility;
    
    market.currentPrice = Math.round(
      market.basePrice * demandFactor * supplyFactor
    );
    
    // Record price history
    market.priceHistory.push({
      price: market.currentPrice,
      timestamp: Date.now(),
      demand: market.demand,
      supply: market.supply
    });
    
    // Keep only last 100 price points
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

## Quest System

### Quest Management

Dynamic quest generation and tracking:

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
    // Check if quest is already active
    if (this.hasActiveQuest(playerId, questId)) {
      return { success: false, reason: 'quest_already_active' };
    }
    
    // Check if quest is already completed and not repeatable
    const quest = this.getQuest(questId);
    if (!quest) {
      return { success: false, reason: 'quest_not_found' };
    }
    
    if (this.completedQuests.has(questId) && !quest.repeatable) {
      return { success: false, reason: 'quest_already_completed' };
    }
    
    // Check prerequisites
    if (quest.prerequisites) {
      for (const prereq of quest.prerequisites) {
        if (!this.completedQuests.has(prereq)) {
          return { success: false, reason: 'missing_prerequisites' };
        }
      }
    }
    
    // Create active quest
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
    // Find all active quests for this player
    for (const [key, activeQuest] of this.activeQuests) {
      if (activeQuest.playerId !== playerId) continue;
      
      // Update matching objectives
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
      
      // Auto-claim rewards if configured
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
    
    // Grant rewards
    const rewardsGranted = this.grantRewards(playerId, quest.rewards);
    
    // Mark as completed
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

## Progression System

### Character Progression

Level-based progression with skill trees:

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
    
    // Check prerequisites
    for (const prereq of node.prerequisites) {
      const prereqNode = this.findNode(tree, prereq);
      if (!prereqNode || !prereqNode.purchased) {
        return { success: false, reason: 'missing_prerequisites' };
      }
    }
    
    // Check cost
    if (progression.points < node.cost) {
      return { success: false, reason: 'insufficient_points' };
    }
    
    // Purchase node
    progression.points -= node.cost;
    node.purchased = true;
    
    // Apply bonuses
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

## Game Balance

### Balance Configuration

Centralized game balance settings:

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
    
    // Apply difficulty modifiers
    this.applyDifficultyModifiers();
  }
  
  private applyDifficultyModifiers(): void {
    const modifiers = this.getDifficultyModifiers(this.difficulty);
    
    // Apply to all balance categories
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

## Related Documentation

- [Complete Development Guide](./development-guide.md) - Comprehensive development guide
- [Architecture Overview](./architecture.md) - System design and component interaction
- [API Reference](./api-reference.md) - Complete API documentation
- [Performance Optimization](./performance.md) - Optimization strategies and benchmarks
- [AI Behavior System](./ai-behavior.md) - NPC intelligence and decision making
- [World Generation](./world-generation.md) - Procedural generation algorithms

---

*For more information, visit [Quantelix AI](https://quantelixai.com/) and [Nebulix AI](https://nebulix.quantelixai.com)*