export const TAU = Math.PI * 2;

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const lerp = (start: number, end: number, alpha: number): number => {
  return (1 - alpha) * start + alpha * end;
};

export const randRange = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

export const seededRandom = (seed: number): () => number => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
};

export const degToRad = (deg: number): number => (deg * Math.PI) / 180;
