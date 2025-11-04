# 世界生成（中文）

> 本文是世界生成系统的中文概要版，涵盖核心管线、地形、生物群系、资源分布、结构生成、生态、天气与气候、持久化、性能优化与配置调优等主题。完整英文版请参阅 `docs/world-generation.md`。

## 目录
- 世界生成概述
- 核心生成管线
- 地形生成
- 生物群系系统
- 资源分布
- 结构生成
- 植物与动物（生态）
- 天气与气候
- 世界持久化
- 性能优化
- 配置与调优
- 相关文档

## 世界生成概述
世界生成系统采用多阶段可配置管线与模块化引擎，通过噪声算法、过渡平滑、资源与结构规则、气候仿真与持久化等组件协同工作，确保地形真实、生态合理、资源分布符合自然规律，并支持大规模世界的可扩展生成与高性能运行。

### 核心生成管线（Core Generation Pipeline）
下列接口与类展示了系统的总体结构与数据流。代码示例保持 TypeScript 原样，以便与引擎实现一致：

```typescript
interface WorldGenerationConfig {
  seed: number;
  worldSize: Vector3;
  chunkSize: Vector3;
  generationStages: GenerationStage[];
  biomeConfig: BiomeConfiguration;
  terrainConfig: TerrainConfiguration;
  resourceConfig: ResourceConfiguration;
  performance: PerformanceConfig;
}

interface GenerationPipeline {
  initialize(config: WorldGenerationConfig): Promise<void>;
  generateChunk(chunkPos: Vector3): Promise<ChunkData>;
  generateRegion(regionPos: Vector3): Promise<RegionData>;
  getBiomeAt(position: Vector3): BiomeType;
  getTerrainHeight(x: number, z: number): number;
  regenerateArea(area: BoundingBox): Promise<void>;
}

class AdvancedWorldGenerator implements GenerationPipeline {
  private noiseGenerators: Map<string, NoiseGenerator> = new Map();
  private biomeEngine: BiomeEngine;
  private terrainEngine: TerrainEngine;
  private resourceEngine: ResourceEngine;
  private structureEngine: StructureEngine;
  private climateEngine: ClimateEngine;
  private persistenceManager: PersistenceManager;
  
  constructor(private config: WorldGenerationConfig) {
    this.initializeEngines();
    this.setupNoiseGenerators();
  }
  
  private initializeEngines(): void {
    this.biomeEngine = new BiomeEngine(this.config.biomeConfig);
    this.terrainEngine = new TerrainEngine(this.config.terrainConfig);
    this.resourceEngine = new ResourceEngine(this.config.resourceConfig);
    this.structureEngine = new StructureEngine();
    this.climateEngine = new ClimateEngine();
    this.persistenceManager = new PersistenceManager();
  }
  
  private setupNoiseGenerators(): void {
    // Base terrain noise
    this.noiseGenerators.set('terrain', new PerlinNoise({
      seed: this.config.seed,
      octaves: 6,
      frequency: 0.01,
      amplitude: 1.0,
      lacunarity: 2.0,
      persistence: 0.5
    }));
    
    // Biome noise for smooth transitions
    this.noiseGenerators.set('biome', new PerlinNoise({
      seed: this.config.seed + 1,
      octaves: 4,
      frequency: 0.005,
      amplitude: 1.0,
      lacunarity: 2.0,
      persistence: 0.4
    }));
    
    // Resource distribution noise
    this.noiseGenerators.set('resources', new PerlinNoise({
      seed: this.config.seed + 2,
      octaves: 3,
      frequency: 0.02,
      amplitude: 1.0,
      lacunarity: 2.0,
      persistence: 0.6
    }));
    
    // Climate variation noise
    this.noiseGenerators.set('climate', new PerlinNoise({
      seed: this.config.seed + 3,
      octaves: 5,
      frequency: 0.008,
      amplitude: 1.0,
      lacunarity: 2.0,
      persistence: 0.3
    }));
  }
  
  async generateChunk(chunkPos: Vector3): Promise<ChunkData> {
    const chunkData = new ChunkData(chunkPos, this.config.chunkSize);
    
    // Stage 1: Generate base terrain heightmap
    const heightmap = await this.generateHeightmap(chunkPos);
    
    // Stage 2: Determine biomes for the chunk
    const biomeMap = await this.generateBiomeMap(chunkPos);
    
    // Stage 3: Generate terrain blocks based on heightmap and biomes
    const terrainData = await this.generateTerrain(chunkPos, heightmap, biomeMap);
    
    // Stage 4: Distribute resources
    const resourceData = await this.generateResources(chunkPos, terrainData, biomeMap);
    
    // Stage 5: Generate structures
    const structureData = await this.generateStructures(chunkPos, terrainData, biomeMap);
    
    // Stage 6: Generate flora and fauna
    const floraFaunaData = await this.generateFloraFauna(chunkPos, biomeMap, climateData);
    
    // Stage 7: Apply climate and weather effects
    const climateData = await this.generateClimate(chunkPos);
    
    // Combine all data
    chunkData.setTerrainData(terrainData);
    chunkData.setBiomeData(biomeMap);
    chunkData.setResourceData(resourceData);
    chunkData.setStructureData(structureData);
    chunkData.setFloraFaunaData(floraFaunaData);
    chunkData.setClimateData(climateData);
    
    // Apply post-processing
    await this.postProcessChunk(chunkData);
    
    return chunkData;
  }
  
  private async generateHeightmap(chunkPos: Vector3): Promise<HeightmapData> {
    const heightmap = new HeightmapData(this.config.chunkSize.x, this.config.chunkSize.z);
    const terrainNoise = this.noiseGenerators.get('terrain');
    
    for (let x = 0; x < this.config.chunkSize.x; x++) {
      for (let z = 0; z < this.config.chunkSize.z; z++) {
        const worldX = chunkPos.x * this.config.chunkSize.x + x;
        const worldZ = chunkPos.z * this.config.chunkSize.z + z;
        
        // Multi-layered terrain generation
        const baseHeight = this.calculateBaseHeight(worldX, worldZ, terrainNoise);
        const detailHeight = this.calculateDetailHeight(worldX, worldZ, terrainNoise);
        const erosion = this.calculateErosion(worldX, worldZ);
        
        const finalHeight = baseHeight + detailHeight * 0.3 - erosion * 0.2;
        heightmap.setHeight(x, z, finalHeight);
      }
    }
    
    return heightmap;
  }
  
  private calculateBaseHeight(x: number, z: number, noise: NoiseGenerator): number {
    // Continental shelf simulation
    const continentalNoise = noise.getValue(x * 0.001, z * 0.001) * 100;
    
    // Mountain ranges
    const mountainNoise = noise.getValue(x * 0.005, z * 0.005) * 50;
    
    // Valley systems
    const valleyNoise = noise.getValue(x * 0.01, z * 0.01) * 20;
    
    return continentalNoise + mountainNoise + valleyNoise;
  }
}
```

提示：生成管线中各阶段可以按需开启/关闭或替换，实现不同风格的世界生成；同时持久化管理器负责增量保存生成结果与改动，用于回滚与跨会话恢复。

## 地形生成

### 高级地形算法（Advanced Terrain Algorithms）
多层地形生成与地质模拟：

```typescript
interface TerrainLayer {
  type: TerrainType;
  noise: NoiseGenerator;
  amplitude: number;
  frequency: number;
  offset: Vector2;
  blendMode: BlendMode;
}

interface GeologicalFeature {
  type: GeologicalType;
  position: Vector3;
  size: Vector3;
  intensity: number;
  age: number;
}

class AdvancedTerrainEngine {
  private terrainLayers: TerrainLayer[] = [];
  private geologicalFeatures: Map<string, GeologicalFeature> = new Map();
  private erosionSimulator: ErosionSimulator;
  private tectonicSimulator: TectonicSimulator;
  
  constructor(private config: TerrainConfiguration) {
    this.initializeTerrainLayers();
    this.initializeSimulators();
  }
  
  private initializeTerrainLayers(): void {
    // Base continental layer
    this.terrainLayers.push({
      type: TerrainType.CONTINENTAL,
      noise: new PerlinNoise({
        seed: this.config.seed,
        octaves: 8,
        frequency: 0.0005,
        amplitude: 100,
        lacunarity: 2.0,
        persistence: 0.6
      }),
      amplitude: 1.0,
      frequency: 1.0,
      offset: new Vector2(0, 0),
      blendMode: BlendMode.ADDITIVE
    });
    
    // Mountain building layer
    this.terrainLayers.push({
      type: TerrainType.MOUNTAINOUS,
      noise: new RidgedNoise({
        seed: this.config.seed + 1,
        octaves: 6,
        frequency: 0.002,
        amplitude: 80,
        lacunarity: 2.2,
        persistence: 0.4
      }),
      amplitude: 0.8,
      frequency: 1.2,
      offset: new Vector2(1000, 500),
      blendMode: BlendMode.MAXIMUM
    });
    
    // Valley carving layer
    this.terrainLayers.push({
      type: TerrainType.VALLEY,
      noise: new VoronoiNoise({
        seed: this.config.seed + 2,
        frequency: 0.01,
        amplitude: -30,
        displacement: 0.5
      }),
      amplitude: 0.6,
      frequency: 0.8,
      offset: new Vector2(-500, 300),
      blendMode: BlendMode.SUBTRACTIVE
    });
    
    // Detail noise for natural variation
    this.terrainLayers.push({
      type: TerrainType.DETAIL,
      noise: new PerlinNoise({
        seed: this.config.seed + 3,
        octaves: 4,
        frequency: 0.02,
        amplitude: 10,
        lacunarity: 1.5,
        persistence: 0.7
      }),
      amplitude: 0.3,
      frequency: 2.0,
      offset: new Vector2(200, -400),
      blendMode: BlendMode.ADDITIVE
    });
  }
  
  generateTerrainHeight(x: number, z: number): number {
    let height = 0;
    
    // Apply terrain layers
    for (const layer of this.terrainLayers) {
      const noiseValue = layer.noise.getValue(
        (x + layer.offset.x) * layer.frequency,
        (z + layer.offset.y) * layer.frequency
      );
      
      const layerContribution = noiseValue * layer.amplitude;
      height = this.applyBlendMode(height, layerContribution, layer.blendMode);
    }
    
    // Apply geological features
    height = this.applyGeologicalFeatures(x, z, height);
    
    // Apply erosion effects
    height = this.applyErosion(x, z, height);
    
    return height;
  }
  
  private applyGeologicalFeatures(x: number, z: number, baseHeight: number): number {
    let modifiedHeight = baseHeight;
    
    for (const [id, feature] of this.geologicalFeatures) {
      const distance = Math.sqrt(
        Math.pow(x - feature.position.x, 2) + 
        Math.pow(z - feature.position.z, 2)
      );
      
      if (distance < feature.size.x) {
        const influence = this.calculateFeatureInfluence(distance, feature);
        modifiedHeight += influence * feature.intensity;
      }
    }
    
    return modifiedHeight;
  }
  
  generateCaveSystem(chunkPos: Vector3): CaveData {
    const caveData = new CaveData();
    const caveNoise = new WorleyNoise({
      seed: this.config.seed + 1000,
      frequency: 0.1,
      amplitude: 1.0,
      displacement: 0.3
    });
    
    for (let x = 0; x < this.config.chunkSize.x; x++) {
      for (let y = 0; y < this.config.chunkSize.y; y++) {
        for (let z = 0; z < this.config.chunkSize.z; z++) {
          const worldPos = new Vector3(
            chunkPos.x * this.config.chunkSize.x + x,
            chunkPos.y * this.config.chunkSize.y + y,
            chunkPos.z * this.config.chunkSize.z + z
          );
          
          const caveValue = caveNoise.getValue(worldPos.x, worldPos.y, worldPos.z);
          const density = this.calculateCaveDensity(worldPos);
          
          if (caveValue > 0.7 && density > 0.3) {
            caveData.addCavePosition(worldPos);
          }
        }
      }
    }
    
    return caveData;
  }
  
  simulateErosion(terrainData: TerrainData, iterations: number = 1000): TerrainData {
    const erodedData = terrainData.clone();
    
    for (let i = 0; i < iterations; i++) {
      // Hydraulic erosion simulation
      this.simulateHydraulicErosion(erodedData);
      
      // Thermal erosion simulation
      this.simulateThermalErosion(erodedData);
      
      // Wind erosion for exposed areas
      this.simulateWindErosion(erodedData);
    }
    
    return erodedData;
  }
  
  private simulateHydraulicErosion(terrain: TerrainData): void {
    // Simulate water flow and sediment transport
    const waterHeight = new Float32Array(terrain.width * terrain.height);
    const sediment = new Float32Array(terrain.width * terrain.height);
    
    // Add water from rainfall simulation
    this.simulateRainfall(waterHeight);
    
    // Simulate water flow
    for (let iteration = 0; iteration < 10; iteration++) {
      for (let x = 1; x < terrain.width - 1; x++) {
        for (let z = 1; z < terrain.height - 1; z++) {
          const idx = x + z * terrain.width;
          const currentHeight = terrain.getHeight(x, z) + waterHeight[idx];
          
          // Calculate water flow to neighbors
          let totalFlow = 0;
          const flows = [];
          
          for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
              if (dx === 0 && dz === 0) continue;
              
              const neighborIdx = (x + dx) + (z + dz) * terrain.width;
              const neighborHeight = terrain.getHeight(x + dx, z + dz) + waterHeight[neighborIdx];
              
              if (currentHeight > neighborHeight) {
                const flow = (currentHeight - neighborHeight) * 0.5;
                flows.push({ dx, dz, flow });
                totalFlow += flow;
              }
            }
          }
          
          // Apply water flow and erosion
          for (const flow of flows) {
            const flowRatio = flow.flow / totalFlow;
            const erosionAmount = flowRatio * 0.1;
            const depositionAmount = sediment[idx] * 0.01;
            
            // Eode terrain
            terrain.setHeight(x, z, terrain.getHeight(x, z) - erosionAmount);
            
            // Transport sediment
            sediment[idx] -= depositionAmount;
            sediment[x + flow.dx + (z + flow.dz) * terrain.width] += depositionAmount;
          }
        }
      }
    }
  }
}
```

说明：上述算法通过多层噪声与地质过程组合实现宏观地形（大陆架、山脉、河谷）与微观细节（洞穴、侵蚀形态）。侵蚀与水流仿真可按迭代次数调优以平衡真实感与性能。

## 生物群系系统

### 高级生物群系生成（Advanced Biome Generation）
基于气候分布的群系生成，并实现平滑过渡：

```typescript
interface BiomeClimate {
  temperature: number; // -1.0（寒冷）到 1.0（炎热）
  humidity: number;    // 0.0（干燥）到 1.0（湿润）
  elevation: number;   // 0.0（海平面）到 1.0（高山）
  latitude: number;    // -1.0（南极）到 1.0（北极）
}

interface BiomeType {
  id: string;
  name: string;
  climateRequirements: ClimateRange;
  terrainModifiers: TerrainModifier[];
  resourceDistribution: ResourceDistribution;
  floraTypes: FloraType[];
  faunaTypes: FaunaType[];
  structureTypes: StructureType[];
  colorPalette: ColorPalette;
}

class AdvancedBiomeEngine {
  private biomeTypes: Map<string, BiomeType> = new Map();
  private climateNoise: NoiseGenerator;
  private transitionEngine: BiomeTransitionEngine;
  private seasonalEngine: SeasonalEngine;
  
  constructor(private config: BiomeConfiguration) {
    this.initializeBiomeTypes();
    this.setupClimateSystem();
  }
  
  private initializeBiomeTypes(): void {
    // 北极苔原
    this.biomeTypes.set('arctic_tundra', {
      id: 'arctic_tundra',
      name: 'Arctic Tundra',
      climateRequirements: {
        temperature: { min: -1.0, max: -0.7 },
        humidity: { min: 0.2, max: 0.6 },
        elevation: { min: 0.0, max: 0.3 }
      },
      terrainModifiers: [
        { type: 'permafrost', strength: 0.8 },
        { type: 'ice_layers', strength: 0.6 }
      ],
      resourceDistribution: {
        'ice': 0.8,
        'packed_ice': 0.3,
        'snow': 0.9,
        'sparse_wood': 0.1
      },
      floraTypes: ['arctic_moss', 'small_shrubs'],
      faunaTypes: ['arctic_fox', 'polar_bear', 'seals'],
      structureTypes: ['ice_caves', 'inuit_villages'],
      colorPalette: {
        primary: '#E8F4F8',
        secondary: '#B8D4E3',
        accent: '#4A90A4'
      }
    });
    
    // 针叶林（泰加林）
    this.biomeTypes.set('boreal_forest', {
      id: 'boreal_forest',
      name: 'Boreal Forest',
      climateRequirements: {
        temperature: { min: -0.7, max: -0.2 },
        humidity: { min: 0.4, max: 0.8 },
        elevation: { min: 0.1, max: 0.6 }
      },
      terrainModifiers: [
        { type: 'coniferous', strength: 0.9 },
        { type: 'bog_areas', strength: 0.3 }
      ],
      resourceDistribution: {
        'spruce_wood': 0.7,
        'pine_wood': 0.6,
        'berries': 0.4,
        'mushrooms': 0.5
      },
      floraTypes: ['spruce', 'pine', 'fir', 'moss'],
      faunaTypes: ['moose', 'wolf', 'bear', 'lynx'],
      structureTypes: ['log_cabins', 'hunting_camps'],
      colorPalette: {
        primary: '#2D5A3D',
        secondary: '#4A7C59',
        accent: '#8FBC8F'
      }
    });
    
    // 温带阔叶林
    this.biomeTypes.set('temperate_forest', {
      id: 'temperate_forest',
      name: 'Temperate Forest',
      climateRequirements: {
        temperature: { min: -0.2, max: 0.3 },
        humidity: { min: 0.5, max: 0.8 },
        elevation: { min: 0.1, max: 0.5 }
      },
      terrainModifiers: [
        { type: 'deciduous', strength: 0.8 },
        { type: 'seasonal_changes', strength: 1.0 }
      ],
      resourceDistribution: {
        'oak_wood': 0.6,
        'maple_wood': 0.4,
        'apple_trees': 0.3,
        'wildflowers': 0.7
      },
      floraTypes: ['oak', 'maple', 'birch', 'wildflowers'],
      faunaTypes: ['deer', 'fox', 'rabbit', 'squirrel'],
      structureTypes: ['villages', 'farmsteads'],
      colorPalette: {
        primary: '#8B4513',
        secondary: '#228B22',
        accent: '#FFD700'
      }
    });
    
    // 热带雨林
    this.biomeTypes.set('tropical_rainforest', {
      id: 'tropical_rainforest',
      name: 'Tropical Rainforest',
      climateRequirements: {
        temperature: { min: 0.7, max: 1.0 },
        humidity: { min: 0.8, max: 1.0 },
        elevation: { min: 0.0, max: 0.4 }
      },
      terrainModifiers: [
        { type: 'dense_canopy', strength: 0.9 },
        { type: 'liana_vines', strength: 0.6 }
      ],
      resourceDistribution: {
        'mahogany': 0.5,
        'teak': 0.4,
        'exotic_fruits': 0.8,
        'medicinal_plants': 0.6
      },
      floraTypes: ['tall_trees', 'lianas', 'epiphytes', 'ferns'],
      faunaTypes: ['jaguar', 'monkeys', 'parrots', 'snakes'],
      structureTypes: ['tree_villages', 'temple_ruins'],
      colorPalette: {
        primary: '#228B22',
        secondary: '#32CD32',
        accent: '#FF6347'
      }
    });
  }
  
  getBiomeAt(climate: BiomeClimate): BiomeType {
    const candidates = [];
    
    for (const [id, biome] of this.biomeTypes) {
      const score = this.calculateBiomeSuitability(biome, climate);
      if (score > 0.3) {
        candidates.push({ biome, score });
      }
    }
    
    // 按适配度排序
    candidates.sort((a, b) => b.score - a.score);
    
    if (candidates.length === 0) {
      return this.getFallbackBiome(climate);
    }
    
    // 应用平滑过渡
    return this.applyBiomeTransition(candidates, climate);
  }
  
  private calculateBiomeSuitability(biome: BiomeType, climate: BiomeClimate): number {
    const tempMatch = this.calculateClimateMatch(
      climate.temperature,
      biome.climateRequirements.temperature
    );
    
    const humidityMatch = this.calculateClimateMatch(
      climate.humidity,
      biome.climateRequirements.humidity
    );
    
    const elevationMatch = this.calculateClimateMatch(
      climate.elevation,
      biome.climateRequirements.elevation
    );
    
    // 加权平均（温度权重最高）
    return tempMatch * 0.5 + humidityMatch * 0.3 + elevationMatch * 0.2;
  }
}
```

说明：群系引擎通过气候参数（温度、湿度、海拔、纬度）选择最合适的群系，并对邻域进行平滑过渡，避免硬切换边界。

## 资源分布

### 高级资源分布（Advanced Resource Distribution）
结合地质历史与宿主岩石，生成真实矿产模型：

```typescript
async generateResourceDeposits(area: BoundingBox, geologicalSurvey: GeologicalSurvey): Promise<ResourceDeposit[]> {
  const deposits: ResourceDeposit[] = [];
  
  // 分析地质适配性
  const suitability = this.analyzeGeologicalSuitability(geologicalSurvey);
  
  // 基于地质历史生成矿体
  for (const [resourceType, model] of this.resourceModels) {
    if (this.isGeologicallySuitable(model, geologicalSurvey)) {
      const depositCount = this.calculateDepositCount(model, area, suitability);
      
      for (let i = 0; i < depositCount; i++) {
        const deposit = this.generateRealisticDeposit(model, area, geologicalSurvey);
        if (deposit) {
          deposits.push(deposit);
        }
      }
    }
  }
  
  // 应用后续地质过程（搬运、沉积等）
  this.applyPostGeneticProcesses(deposits, geologicalSurvey);
  
  return deposits;
}
```

说明：资源分布不仅依赖噪声，也考虑地质成因（沉积、变质、热液作用）与宿主岩石类型，形成真实的空间分布与聚集效应。

## 结构生成

### 程序化结构系统（Procedural Structure System）
在保持文化风格与历史语境的基础上生成结构：

```typescript
class AdvancedStructureEngine {
  private structureTemplates: Map<string, StructureTemplate> = new Map();
  private culturalInfluences: Map<string, CulturalInfluence> = new Map();
  private deteriorationEngine: DeteriorationEngine;
  
  constructor() {
    this.initializeStructureTemplates();
    this.setupCulturalSystem();
  }
  
  async generateStructure(templateId: string, position: Vector3, biome: BiomeType): Promise<GeneratedStructure> {
    const template = this.structureTemplates.get(templateId);
    if (!template) throw new Error(`Structure template ${templateId} not found`);
    
    // 群系适配性检查
    const suitability = this.calculateBiomeSuitability(template, biome);
    
    // 基础结构生成
    const structure = new GeneratedStructure(template, position);
    
    // 适配局部条件
    const adaptedStructure = this.adaptToLocalConditions(structure, biome, suitability);
    
    // 生成细节组件
    const detailedComponents = await this.generateDetailedComponents(adaptedStructure);
    
    // 应用文化变体
    const culturalVariations = this.applyCulturalVariations(adaptedStructure, biome);
    
    // 应用年代感与损耗
    const agedStructure = this.applyAgeAndDeterioration(adaptedStructure);
    return agedStructure;
  }
}
```

说明：结构系统通过模板与文化系统结合，在不同群系中使用本地材料与适配策略（如雨水防护、通风、尺寸缩放），同时可加入历史遗迹的损耗效果以增强真实感。

## 植物与动物（生态）

### 生态系统生成（Ecosystem Generation）
通过物种交互模拟真实生态：

```typescript
class AdvancedEcosystemEngine {
  private speciesDatabase: Map<string, Species> = new Map();
  private ecosystemModels: Map<string, EcosystemModel> = new Map();
  private successionEngine: SuccessionEngine;
  private migrationEngine: MigrationEngine;
  
  generateEcosystem(center: Vector3, radius: number, biome: BiomeType, climate: ClimateData): Ecosystem {
    const ecosystem = new Ecosystem(center, radius);
    
    // 选择适配物种
    const suitableSpecies = this.getSuitableSpecies(biome, climate);
    
    // 计算承载力
    const carryingCapacities = this.calculateCarryingCapacities(suitableSpecies, biome, climate);
    
    // 初始化种群
    for (const species of suitableSpecies) {
      const initialPopulation = this.calculateInitialPopulation(species, carryingCapacities);
      ecosystem.addSpecies(species.id, new SpeciesPopulation(species, initialPopulation));
    }
    
    // 构建食物网与生态过程
    ecosystem.setFoodWeb(this.buildFoodWeb(suitableSpecies));
    this.setupEcologicalProcesses(ecosystem);
    
    // 初始演替
    this.simulateSuccession(ecosystem, 50);
    return ecosystem;
  }
}
```

说明：生态引擎采用逻辑斯蒂增长、密度制约、迁徙与竞争/捕食等机制，随气候与群系变化而动态调整种群结构与生态过程。

## 天气与气候

### 动态天气系统（Dynamic Weather System）
结合气候格网与大气模型，生成真实天气：

```typescript
interface WeatherSystem {
  currentWeather: WeatherState;
  climateData: ClimateData;
  seasonalPatterns: SeasonalPattern[];
  atmosphericConditions: AtmosphericConditions;
  weatherEvents: WeatherEvent[];
}

interface ClimateSimulation {
  temperature: TemperatureSimulation;
  precipitation: PrecipitationSimulation;
  wind: WindSimulation;
  pressure: PressureSimulation;
  humidity: HumiditySimulation;
}

class AdvancedWeatherEngine {
  private climateGrid: ClimateGrid;
  private atmosphericModel: AtmosphericModel;
  private oceanicModel: OceanicModel;
  private seasonalEngine: SeasonalEngine;
  private extremeEventEngine: ExtremeEventEngine;
  
  constructor(private config: WeatherConfiguration) {
    this.initializeClimateSystem();
    this.setupAtmosphericModels();
  }
  
  private initializeClimateSystem(): void {
    this.climateGrid = new ClimateGrid(this.config.worldSize);
    this.atmosphericModel = new AtmosphericModel();
    this.oceanicModel = new OceanicModel();
    this.seasonalEngine = new SeasonalEngine();
    this.extremeEventEngine = new ExtremeEventEngine();
  }
  
  simulateWeather(position: Vector3, time: DateTime): WeatherState {
    const climateData = this.climateGrid.getClimateData(position);
    const seasonalEffects = this.seasonalEngine.calculateEffects(time, climateData);
    const atmosphericConditions = this.atmosphericModel.simulate(position, time);
    
    const localWeather = this.calculateLocalWeather(climateData, seasonalEffects, atmosphericConditions);
    const topographicWeather = this.applyTopographicEffects(localWeather, position);
    const extremeWeather = this.extremeEventEngine.checkForEvents(topographicWeather, time);
    return extremeWeather || topographicWeather;
  }
  
  private calculateLocalWeather(climate: ClimateData, seasonal: SeasonalEffects, atmospheric: AtmosphericConditions): WeatherState {
    const baseTemperature = climate.baseTemperature + seasonal.temperatureModifier;
    const diurnalVariation = this.calculateDiurnalVariation(atmospheric.timeOfDay);
    const altitudeEffect = this.calculateAltitudeEffect(climate.elevation);
    const temperature = baseTemperature + diurnalVariation + altitudeEffect;
    
    const humidity = climate.humidity + seasonal.humidityModifier;
    const pressure = atmospheric.pressure;
    const windConvergence = atmospheric.windConvergence;
    const precipitationProbability = this.calculatePrecipitationProbability(humidity, pressure, windConvergence);
    const precipitationType = this.determinePrecipitationType(temperature, humidity, pressure);
    
    const windSpeed = this.calculateWindSpeed(atmospheric.pressureGradient, altitudeEffect);
    const windDirection = atmospheric.windDirection;
    const cloudCover = this.calculateCloudCover(humidity, pressure, precipitationProbability);
    
    return new WeatherState({
      temperature,
      precipitation: {
        probability: precipitationProbability,
        type: precipitationType,
        intensity: this.calculatePrecipitationIntensity(precipitationProbability, humidity)
      },
      wind: {
        speed: windSpeed,
        direction: windDirection
      },
      cloudCover,
      visibility: this.calculateVisibility(cloudCover, precipitationType),
      humidity: humidity * 100
    });
  }
  
  generateClimateForecast(position: Vector3, days: number): ClimateForecast {
    const forecast = new ClimateForecast();
    for (let day = 0; day < days; day++) {
      const date = new Date();
      date.setDate(date.getDate() + day);
      const dailyWeather = [];
      for (let hour = 0; hour < 24; hour += 3) {
        const time = new Date(date);
        time.setHours(hour);
        const weather = this.simulateWeather(position, time);
        dailyWeather.push(weather);
      }
      forecast.addDay({
        date,
        weather: dailyWeather,
        summary: this.generateDailySummary(dailyWeather)
      });
    }
    return forecast;
  }
  
  simulateExtremeWeatherEvent(eventType: ExtremeWeatherType, position: Vector3, intensity: number): ExtremeWeatherEvent {
    const event = new ExtremeWeatherEvent(eventType, position, intensity);
    const climate = this.climateGrid.getClimateData(position);
    event.duration = this.extremeEventEngine.calculateDuration(eventType, intensity);
    event.affectedArea = this.extremeEventEngine.calculateAffectedArea(position, intensity);
    event.impact = this.extremeEventEngine.calculateImpact(eventType, intensity, climate);

    const currentWeather = this.simulateWeather(position, new Date());
    event.resultingWeather = this.extremeEventEngine.applyImpact(currentWeather, event);

    this.extremeEventEngine.activate(event);
    return event;
  }
}
```

说明：天气引擎通过温度、降水、风压、湿度等子系统计算局地天气，叠加地形效应；季节与昼夜变化提供动态调制。支持气候预报（按日/小时采样）与极端天气事件模拟（持续时间、影响范围与后果评估）。

## 世界持久化
- 目标：在不影响生成与游玩性能的前提下，可靠保存世界状态（地形改动、结构建造、资源采集、生态变化、气候累计影响）。
- 存储单元：按 `Chunk` 为粒度进行持久化，支持跨区块的事务合并与一致性校验。
- 数据模型：基础层（高度图与方块）、叠加层（结构与装饰）、系统层（资源矿体、生态快照、天气缓存）。
- 写入策略：增量日志（Delta Log）+ 周期快照（Snapshot），结合压缩与去重降低 IO 与磁盘占用。
- 读取策略：惰性加载与优先队列；靠近玩家与摄像机的区块优先恢复，远离区域按需后台加载。
- 回滚与恢复：针对破坏或编辑操作提供版本回滚；崩溃恢复依赖最近快照与日志重放。
- 互操作：与生成管线协作，先加载已持久化内容，再决定是否重新生成或局部重建，确保确定性与一致性。

## 性能优化
- 空间分区与可见性：区块化加载、八叉树/网格分区、视锥裁剪与遮挡查询，减少渲染与碰撞计算。
- 缓存与复用：噪声与高度查询记忆化；区块生成结果落盘缓存；资源矿体、结构模板与生态快照复用。
- 并行与异步：地形/群系/天气并行计算；流式 IO 与任务优先级队列；避免主线程阻塞。
- 数值与算法：按可视距离动态降低噪声八度数与迭代次数；预计算气候格网与侵蚀权重；向量化热路径循环。
- 调试与监控：采样计数器、耗时热图、区块生成瀑布图与资源使用统计，定位热点并按需降级。
- 参考：详见英文版 [Performance Optimization](./performance.md) 与中文版 [性能优化](./performance-zh.md)。

## 配置与调优
- 全局：`seed`、`worldSize`、`chunkSize`；不同平台与模式（单机/客户端/服务端）可使用独立配置集。
- 噪声：`octaves`、`frequency`、`amplitude`、`lacunarity`、`persistence`；为不同阶段（地形/群系/资源/气候）分别设定与校准。
- 群系与气候：群系权重与过渡平滑参数；气候分布与季节因子；可视化叠加图用于校准边界与热区。
- 阶段开关：生成管线各阶段（资源、结构、生态、天气）可按需启用/禁用或替换实现，以满足玩法与性能目标。
- 质量档位：`low`/`medium`/`high`/`ultra` 预设，统一控制细节层级、迭代次数与采样密度。
- 参考：英文版目录项 [Configuration and Tuning](./world-generation.md#configuration-and-tuning) 以及 [Development Guide](./development-guide.md)；中文版参见 [开发指南](./development-guide-zh.md)。

## 相关文档
- 英文/中文：[`World Generation`](./world-generation.md) / [`世界生成`](./world-generation-zh.md)
- 英文/中文：[`Performance Optimization`](./performance.md) / [`性能优化`](./performance-zh.md)
- 英文/中文：[`Development Guide`](./development-guide.md) / [`开发指南`](./development-guide-zh.md)
- 英文/中文：[`Architecture`](./architecture.md) / [`架构概述`](./architecture-zh.md)
- 英文/中文：[`API Reference`](./api-reference.md) / [`API参考`](./api-reference-zh.md)
- 英文/中文：[`Game Mechanics`](./game-mechanics.md) / [`游戏机制`](./game-mechanics-zh.md)
- 英文/中文：[`AI Behavior`](./ai-behavior.md) / [`AI行为系统`](./ai-behavior-zh.md)