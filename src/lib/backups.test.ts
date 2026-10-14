import { describe, it, expect } from "vitest";
import { initialEdit } from "../engine/types";
import { autoBalance, measure } from "../engine/analysis";
import { validateEdit, importRecipe } from "./backups";
describe("portable editing data", () => {
  it("restores a typed edit without accepting unsafe transforms", () => {
    expect(validateEdit(initialEdit())).toEqual(initialEdit());
    expect(() => validateEdit({ ...initialEdit(), rotation: 999 })).toThrow();
    expect(() => validateEdit({ ...initialEdit(), crop: "script" })).toThrow();
  });
  it("clamps imported adjustment numbers and ignores unknown keys", () => {
    const edit = validateEdit({
      ...initialEdit(),
      adjustments: { exposure: 99, temperature: -999, script: 1 },
    });
    expect(edit.adjustments.exposure).toBe(2);
    expect(edit.adjustments.temperature).toBe(-100);
    expect(edit.adjustments).not.toHaveProperty("script");
  });
  it("imports only recognized JSON recipe parameters", async () => {
    const file = new File(
      [
        JSON.stringify({
          format: "acharya-look",
          version: 1,
          name: "My recipe",
          adjustments: { exposure: 0.25, unknown: 1 },
        }),
      ],
      "look.json",
    );
    const preset = await importRecipe(file);
    expect(preset.name).toBe("My recipe");
    expect(preset.adjustments).toEqual({ exposure: 0.25 });
    expect(preset.category).toBe("Custom");
  });
  it("rejects invalid or oversized recipe files", async () => {
    await expect(importRecipe(new File(["{}"], "bad.json"))).rejects.toThrow(
      "valid Acharya",
    );
    await expect(
      importRecipe(new File(["x".repeat(70_000)], "huge.json")),
    ).rejects.toThrow("64 KB");
  });
});
describe("measured one-click balance", () => {
  it("lifts a dark photo conservatively", () => {
    const patch = autoBalance(
      measure(new Uint8ClampedArray([10, 10, 10, 255])),
    );
    expect(patch.exposure).toBe(0.75);
    expect(patch.shadows).toBe(25);
  });
  it("reduces overexposure without exceeding safe limits", () => {
    const patch = autoBalance(
      measure(new Uint8ClampedArray([255, 255, 255, 255])),
    );
    expect(patch.exposure).toBe(-0.75);
    expect(patch.highlights).toBe(-25);
  });
});
