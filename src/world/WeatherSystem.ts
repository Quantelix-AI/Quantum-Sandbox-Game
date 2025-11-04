import { WeatherType } from "@/types";
import { randRange } from "@/utils/MathUtils";

export interface WeatherState {
  type: WeatherType;
  intensity: number;
  temperatureOffset: number;
  visibility: number;
}

const WEATHER_TRANSITIONS: Record<WeatherType, WeatherType[]> = {
  clear: ["clear", "rain", "fog"],
  rain: ["clear", "rain", "storm", "fog"],
  storm: ["rain", "storm"],
  fog: ["clear", "fog", "rain"],
  snow: ["snow", "clear", "fog"],
};

export class WeatherSystem {
  private current: WeatherState = {
    type: "clear",
    intensity: 0,
    temperatureOffset: 0,
    visibility: 1,
  };
  private timeUntilChange = 0;

  initialize(): void {
    this.timeUntilChange = randRange(30, 120);
  }

  update(deltaSeconds: number): void {
    this.timeUntilChange -= deltaSeconds;
    if (this.timeUntilChange > 0) return;

    this.timeUntilChange = randRange(45, 180);
    const candidates = WEATHER_TRANSITIONS[this.current.type];
    const nextType = candidates[Math.floor(Math.random() * candidates.length)];
    this.current = this.generateState(nextType);
  }

  getState(): WeatherState {
    return this.current;
  }

  private generateState(type: WeatherType): WeatherState {
    switch (type) {
      case "rain":
        return {
          type,
          intensity: randRange(0.2, 0.8),
          temperatureOffset: randRange(-2, 2),
          visibility: 0.7,
        };
      case "storm":
        return {
          type,
          intensity: randRange(0.7, 1),
          temperatureOffset: randRange(-3, 1),
          visibility: 0.5,
        };
      case "fog":
        return {
          type,
          intensity: randRange(0.4, 0.9),
          temperatureOffset: randRange(-1, 1),
          visibility: 0.4,
        };
      case "snow":
        return {
          type,
          intensity: randRange(0.3, 0.7),
          temperatureOffset: randRange(-10, -3),
          visibility: 0.6,
        };
      default:
        return {
          type: "clear",
          intensity: 0,
          temperatureOffset: 0,
          visibility: 1,
        };
    }
  }
}
