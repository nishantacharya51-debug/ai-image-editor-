import type { Adjustments } from "./types";
const clamp = (n: number) => Math.max(0, Math.min(255, n));
/** Deterministic per-pixel grading. Reads from an untouched source on every render. */
export function gradePixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  a: Adjustments,
) {
  const contrast = 1 + a.contrast / 100;
  const exposure = 2 ** a.exposure;
  const gamma = 1 / a.gamma;
  const angle = (a.hue * Math.PI) / 180,
    cos = Math.cos(angle),
    sin = Math.sin(angle);
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const shadow = (1 - lum) ** 2,
      highlight = lum ** 2;
    const lift =
      a.shadows * shadow * 0.65 +
      a.highlights * highlight * 0.65 +
      a.whites * lum ** 4 * 0.5 +
      a.blacks * (1 - lum) ** 4 * 0.5;
    r =
      r * exposure +
      lift +
      a.brightness * 1.25 +
      a.temperature * 0.48 +
      a.tint * 0.2 +
      a.red * 0.6;
    g =
      g * exposure + lift + a.brightness * 1.25 - a.tint * 0.32 + a.green * 0.6;
    b =
      b * exposure +
      lift +
      a.brightness * 1.25 -
      a.temperature * 0.48 +
      a.tint * 0.2 +
      a.blue * 0.6;
    const tone = a.shadowTone * shadow + a.highlightTone * highlight;
    r += tone * 0.35;
    b -= tone * 0.35;
    r = (r - 128) * contrast + 128;
    g = (g - 128) * contrast + 128;
    b = (b - 128) * contrast + 128;
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const sat =
      (1 + a.saturation / 100) *
      (1 +
        (a.vibrance / 100) *
          (1 - Math.min(1, (Math.max(r, g, b) - Math.min(r, g, b)) / 255)));
    r = l + (r - l) * sat;
    g = l + (g - l) * sat;
    b = l + (b - l) * sat;
    if (a.hue) {
      const u = r - l,
        v = b - l;
      r = l + u * cos - v * sin;
      b = l + u * sin + v * cos;
      g = (l - 0.2126 * r - 0.0722 * b) / 0.7152;
    }
    r = 255 * (clamp(r) / 255) ** gamma;
    g = 255 * (clamp(g) / 255) ** gamma;
    b = 255 * (clamp(b) / 255) ** gamma;
    const fade = (a.fade / 100) * 0.45;
    r = r * (1 - fade) + 255 * fade * 0.42;
    g = g * (1 - fade) + 255 * fade * 0.42;
    b = b * (1 - fade) + 255 * fade * 0.42;
    const x = ((i / 4) % width) / width - 0.5,
      y = Math.floor(i / 4 / width) / height - 0.5;
    const vignette = 1 - Math.min(0.9, ((x * x + y * y) * a.vignette) / 65);
    const noise =
      (((((Math.sin(i * 12.9898) * 43758.5453) % 1) + 1) % 1) - 0.5) *
      a.grain *
      0.65;
    data[i] = clamp(r * vignette + noise);
    data[i + 1] = clamp(g * vignette + noise);
    data[i + 2] = clamp(b * vignette + noise);
  }
  return data;
}
