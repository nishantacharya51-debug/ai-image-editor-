import { presets } from "../data/presets";
import type { Adjustments } from "./types";
export interface Measurements {
  brightness: number;
  contrast: number;
  saturation: number;
  clippedShadows: number;
  clippedHighlights: number;
  warmth: number;
  observations: string[];
}
export function measure(data: Uint8ClampedArray): Measurements {
  let total = 0,
    sq = 0,
    sat = 0,
    black = 0,
    white = 0,
    warm = 0;
  const n = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2],
      l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    total += l;
    sq += l * l;
    warm += r - b;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    sat += max ? (max - min) / max : 0;
    if (l < 8) black++;
    if (l > 247) white++;
  }
  const brightness = (total / n / 255) * 100,
    contrast = (Math.sqrt(sq / n - (total / n) ** 2) / 255) * 100;
  const observations = [
    brightness < 35
      ? "Low overall luminance: try lifting exposure and shadows."
      : brightness > 70
        ? "Bright overall luminance: preserve your highlights."
        : "Balanced overall luminance; creative grading is a good starting point.",
    warm / n > 15
      ? "Red channel exceeds blue on average. This can reflect warm light or warm-colored subjects."
      : warm / n < -15
        ? "Blue channel exceeds red on average. This can reflect cool light or blue-colored subjects."
        : "No strong average red–blue channel imbalance.",
    `${((black / n) * 100).toFixed(1)}% near-black and ${((white / n) * 100).toFixed(1)}% near-white pixels.`,
  ];
  return {
    brightness,
    contrast,
    saturation: (sat / n) * 100,
    clippedShadows: (black / n) * 100,
    clippedHighlights: (white / n) * 100,
    warmth: warm / n,
    observations,
  };
}
export function recommend(m: Measurements, type: string) {
  const preferred =
    type === "Portrait"
      ? ["Portrait", "Professional headshots", "Fashion"]
      : type === "Product"
        ? ["Product", "Minimal", "Food"]
        : type === "Landscape"
          ? ["Landscape", "Travel", "Cinematic"]
          : [];
  return [...presets]
    .sort(
      (a, b) =>
        Number(preferred.includes(b.category)) -
        Number(preferred.includes(a.category)),
    )
    .filter(
      (p) =>
        type !== "Product" ||
        !["Portrait", "Professional headshots"].includes(p.category),
    )
    .slice(0, 15)
    .map((p) => ({
      ...p,
      adjustments: {
        ...p.adjustments,
        exposure:
          (p.adjustments.exposure ?? 0) +
          (m.brightness < 35 ? 0.2 : m.brightness > 75 ? -0.15 : 0),
      },
    }));
}
export function parseLocalPrompt(text: string): {
  adjustments: Partial<Adjustments>;
  explanation: string;
} {
  const t = text.toLowerCase();
  if (
    /remove|replace|add.*(person|sky|object)|background removal|face|blemish|hair|skin|subject/.test(
      t,
    ) &&
    !/without changing|keeping skin|skin natural|subject too dark/.test(t)
  )
    throw new Error(
      "That request may need segmentation or generative editing, which is not available. Try a color or lighting adjustment.",
    );
  const a: Partial<Adjustments> = {};
  if (/warm|golden|sunset/.test(t)) a.temperature = 25;
  if (/cool|night/.test(t)) a.temperature = -20;
  if (/bright|lighter/.test(t)) a.exposure = 0.3;
  if (/dark|moody/.test(t) && !/(not|without).*dark/.test(t))
    a.exposure = -0.25;
  if (/cinema|editorial/.test(t)) {
    a.contrast = 20;
    a.shadowTone = -15;
    a.highlightTone = 12;
    a.saturation = -10;
  }
  if (/studio|product|professional|store/.test(t)) {
    a.contrast = 10;
    a.shadows = 15;
    a.highlights = -15;
    a.sharpness = 12;
  }
  if (/rich|vivid|vibrant/.test(t)) a.vibrance = 30;
  if (/soft/.test(t)) {
    a.contrast = -12;
    a.shadows = 20;
  }
  if (/black and white|monochrome|noir/.test(t)) {
    a.saturation = -100;
    a.contrast = 25;
  }
  if (/film|vintage/.test(t)) {
    a.fade = 18;
    a.grain = 15;
    a.temperature = 12;
  }
  if (/natural|subtle/.test(t))
    for (const key of Object.keys(a) as (keyof Adjustments)[])
      a[key] = (a[key] ?? 0) * 0.6;
  if (!Object.keys(a).length)
    throw new Error(
      "The offline interpreter did not recognize that request. Try “warmer with soft shadows” or enable Gemini for broader language understanding.",
    );
  return {
    adjustments: a,
    explanation: `Offline interpretation: ${Object.entries(a)
      .map(([k, v]) => `${k} ${v > 0 ? "+" : ""}${Math.round(v * 100) / 100}`)
      .join(", ")}. Unmentioned settings stay unchanged.`,
  };
}

/** Conservative measured auto-balance, not subject recognition or generative AI. */
export function autoBalance(m: Measurements): Partial<Adjustments> {
  return {
    exposure:
      Math.round(
        Math.max(
          -0.75,
          Math.min(0.75, Math.log2(50 / Math.max(1, m.brightness))),
        ) * 100,
      ) / 100,
    contrast: Math.round(Math.max(-15, Math.min(18, (22 - m.contrast) * 0.8))),
    highlights: m.clippedHighlights > 1 ? -25 : -10,
    shadows: m.brightness < 40 ? 25 : 10,
    vibrance: m.saturation < 35 ? 15 : 0,
  };
}
