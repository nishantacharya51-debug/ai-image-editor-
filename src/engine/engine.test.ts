import { describe, it, expect } from "vitest";
import { defaults, validateAdjustments } from "./types";
import { gradePixels } from "./pixels";
import { measure, recommend, parseLocalPrompt } from "./analysis";
import { presets } from "../data/presets";
const pixels = () =>
  new Uint8ClampedArray([
    45, 88, 122, 255, 190, 130, 80, 128, 10, 20, 30, 255, 240, 220, 250, 0,
  ]);
describe("non-destructive grading", () => {
  it("identity preserves every pixel and alpha", () => {
    const source = pixels();
    expect(gradePixels(pixels(), 2, 2, defaults)).toEqual(source);
  });
  it("exposure in stops changes pixels", () => {
    const result = gradePixels(pixels(), 2, 2, { ...defaults, exposure: 1 });
    expect(result[0]).toBe(90);
    expect(result[3]).toBe(255);
    expect(result[7]).toBe(128);
  });
  it("monochrome has equal RGB channels", () => {
    const p = gradePixels(pixels(), 2, 2, { ...defaults, saturation: -100 });
    for (let i = 0; i < p.length; i += 4) {
      expect(p[i]).toBe(p[i + 1]);
      expect(p[i + 1]).toBe(p[i + 2]);
    }
  });
  it("grain is reproducible across re-renders", () => {
    expect(gradePixels(pixels(), 2, 2, { ...defaults, grain: 30 })).toEqual(
      gradePixels(pixels(), 2, 2, { ...defaults, grain: 30 }),
    );
  });
  it.each(presets)("$name is a distinct actual pixel edit", (preset) => {
    const result = gradePixels(pixels(), 2, 2, {
      ...defaults,
      ...preset.adjustments,
    });
    expect(result).not.toEqual(pixels());
    expect(result[3]).toBe(255);
  });
  it("all preset recipes are unique", () => {
    expect(
      new Set(presets.map((p) => JSON.stringify(p.adjustments))).size,
    ).toBe(20);
  });
});
describe("validated structured adjustments", () => {
  it("clamps known finite numbers and drops unsafe values", () => {
    expect(
      validateAdjustments({
        exposure: 999,
        gamma: -5,
        temperature: -999,
        contrast: NaN,
        saturation: "100",
        injected: "<script>",
        blur: Infinity,
      }),
    ).toEqual({ exposure: 2, gamma: 0.3, temperature: -100 });
  });
  it("rejects non-object outputs", () => {
    expect(() => validateAdjustments(null)).toThrow();
  });
});
describe("measured analysis", () => {
  it("measures objective near-black and near-white fractions", () => {
    const m = measure(
      new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]),
    );
    expect(m.brightness).toBeCloseTo(50);
    expect(m.clippedShadows).toBe(50);
    expect(m.clippedHighlights).toBe(50);
  });
  it("offers 15 non-portrait recommendations for product images", () => {
    const p = recommend(measure(pixels()), "Product");
    expect(p).toHaveLength(15);
    expect(p[0].category).toBe("Product");
    expect(
      p.some(
        (p) =>
          p.category === "Portrait" || p.category === "Professional headshots",
      ),
    ).toBe(false);
  });
  it("adapts recipes to low luminance", () => {
    const m = measure(new Uint8ClampedArray([15, 15, 15, 255]));
    expect(recommend(m, "General")[0].adjustments.exposure).toBe(0.2);
  });
});
describe("honest offline prompts", () => {
  it("translates warm and soft without changing unrelated tools", () => {
    const result = parseLocalPrompt(
      "Make the image warmer with softer shadows and rich colors",
    );
    expect(result.adjustments).toEqual({
      temperature: 25,
      vibrance: 30,
      contrast: -12,
      shadows: 20,
    });
    expect(result.adjustments.saturation).toBeUndefined();
  });
  it("does not darken the subject when explicitly excluded", () => {
    expect(
      parseLocalPrompt(
        "Create a cinematic night look without making the subject too dark",
      ).adjustments.exposure,
    ).toBeUndefined();
  });
  it("refuses generative requests", () => {
    expect(() =>
      parseLocalPrompt("Remove the person and replace the sky"),
    ).toThrow(/not available/);
  });
  it("handles unsupported language with a useful error", () => {
    expect(() => parseLocalPrompt("flibbertigibbet")).toThrow(
      /did not recognize/,
    );
  });
});
