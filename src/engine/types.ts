import { z } from "zod";
export const ranges = {
  exposure: [-2, 2, 0.05],
  brightness: [-100, 100, 1],
  contrast: [-100, 100, 1],
  saturation: [-100, 100, 1],
  vibrance: [-100, 100, 1],
  temperature: [-100, 100, 1],
  tint: [-100, 100, 1],
  highlights: [-100, 100, 1],
  shadows: [-100, 100, 1],
  whites: [-100, 100, 1],
  blacks: [-100, 100, 1],
  gamma: [0.3, 3, 0.05],
  hue: [-180, 180, 1],
  sharpness: [0, 100, 1],
  blur: [0, 12, 0.1],
  fade: [0, 100, 1],
  vignette: [0, 100, 1],
  grain: [0, 60, 1],
  clarity: [-100, 100, 1],
  red: [-100, 100, 1],
  green: [-100, 100, 1],
  blue: [-100, 100, 1],
  shadowTone: [-100, 100, 1],
  highlightTone: [-100, 100, 1],
  smoothing: [0, 100, 1],
  backgroundBlur: [0, 16, 0.5],
  maskRadius: [10, 90, 1],
  maskX: [0, 100, 1],
  maskY: [0, 100, 1],
  textSize: [2, 18, 0.5],
  textX: [0, 100, 1],
  textY: [0, 100, 1],
} as const;
export type AdjustmentKey = keyof typeof ranges;
export type Adjustments = Record<AdjustmentKey, number>;
export interface EditState {
  adjustments: Adjustments;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  crop: string;
  cropX: number;
  cropY: number;
  text: string;
  textColor: string;
  preset: string;
}
export const defaults: Adjustments = Object.fromEntries(
  Object.keys(ranges).map((k) => [
    k,
    k === "gamma"
      ? 1
      : k === "maskRadius"
        ? 40
        : k === "maskX" || k === "maskY" || k === "textX"
          ? 50
          : k === "textY"
            ? 85
            : k === "textSize"
              ? 5
              : 0,
  ]),
) as Adjustments;
export const initialEdit = (): EditState => ({
  adjustments: { ...defaults },
  rotation: 0,
  flipX: false,
  flipY: false,
  crop: "original",
  cropX: 50,
  cropY: 50,
  text: "",
  textColor: "#ffffff",
  preset: "Original",
});
export function validateAdjustments(input: unknown): Partial<Adjustments> {
  const obj = z.record(z.unknown()).parse(input);
  const result: Partial<Adjustments> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key in ranges && typeof value === "number" && Number.isFinite(value)) {
      const [min, max] = ranges[key as AdjustmentKey];
      result[key as AdjustmentKey] = Math.max(min, Math.min(max, value));
    }
  }
  return result;
}
export interface Project {
  id: string;
  name: string;
  original: Blob;
  thumbnail: Blob;
  edit: EditState;
  history: EditState[];
  created: number;
  updated: number;
  favorite: boolean;
  width: number;
  height: number;
}
export interface Preset {
  id: string;
  name: string;
  category: string;
  description: string;
  adjustments: Partial<Adjustments>;
  image: string;
}
