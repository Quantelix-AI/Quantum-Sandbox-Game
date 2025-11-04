import { BiomeType } from "@/types";

export interface BiomeProperties {
  name: string;
  ambientColor: number;
  groundColor: number;
  temperature: number;
  humidity: number;
  description: string;
}

const BIOME_TABLE: Record<BiomeType, BiomeProperties> = {
  forest: {
    name: "森林",
    ambientColor: 0x2c3e50,
    groundColor: 0x1e8449,
    temperature: 18,
    humidity: 0.7,
    description: "繁茂的森林，拥有丰富的资源和中等的危险等级。",
  },
  desert: {
    name: "沙漠",
    ambientColor: 0xf5cba7,
    groundColor: 0xd68910,
    temperature: 35,
    humidity: 0.1,
    description: "炎热干燥的沙漠，资源稀缺但矿产丰富。",
  },
  tundra: {
    name: "冻原",
    ambientColor: 0x85c1e9,
    groundColor: 0xd6eaf8,
    temperature: -5,
    humidity: 0.4,
    description: "寒冷的冻原，资源稀少但可能出现稀有生物。",
  },
  swamp: {
    name: "沼泽",
    ambientColor: 0x145a32,
    groundColor: 0x27ae60,
    temperature: 22,
    humidity: 0.9,
    description: "潮湿的沼泽地，危险生物较多，需要注意防护。",
  },
  plains: {
    name: "平原",
    ambientColor: 0x82e0aa,
    groundColor: 0x196f3d,
    temperature: 20,
    humidity: 0.5,
    description: "开阔的平原，视野良好，适合建造和探索。",
  },
};

export class BiomeSystem {
  getProperties(biome: BiomeType): BiomeProperties {
    return BIOME_TABLE[biome];
  }
}
