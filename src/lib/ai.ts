import { z } from "zod";
import { validateAdjustments } from "../engine/types";
import { cloudConfigured, cloudRequest } from "../auth/client";
import { isGitHubPages } from "./paths";
const schema = z.object({
  photoType: z.string().max(100).optional(),
  observations: z.array(z.string().max(500)).max(20).default([]),
  explanation: z.string().max(2000).default(""),
  adjustments: z.record(z.number()).default({}),
  suggestions: z
    .array(
      z.object({
        id: z.string().max(100),
        name: z.string().max(100),
        description: z.string().max(500),
        adjustments: z.record(z.number()),
      }),
    )
    .max(20)
    .default([]),
});
export async function askAI(
  image: string,
  prompt: string,
  mode: "analyze" | "prompt",
) {
  if (isGitHubPages && !cloudConfigured)
    throw new Error(
      "The online AI backend is not configured yet. Visit Account for setup details, or continue with local tools.",
    );
  let body: unknown;
  if (cloudConfigured) {
    body = await cloudRequest(mode, { image, prompt });
  } else {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image, prompt, mode }),
      signal: AbortSignal.timeout(35000),
    });
    const payload = await response.json().catch(() => {
      throw new Error(
        "AI returned invalid JSON or the server is unavailable. No changes applied.",
      );
    });
    if (!response.ok || payload?.error)
      throw new Error(payload?.error || "AI request failed.");
    body = payload;
  }
  const parsed = schema.safeParse(body);
  if (
    !parsed.success ||
    (!parsed.data.explanation &&
      !parsed.data.observations.length &&
      !parsed.data.suggestions.length &&
      !Object.keys(parsed.data.adjustments).length)
  ) {
    throw new Error("AI returned invalid structured data. No changes applied.");
  }
  const data = parsed.data;
  return {
    ...data,
    adjustments: validateAdjustments(data.adjustments),
    suggestions: data.suggestions.map((p) => ({
      ...p,
      adjustments: validateAdjustments(p.adjustments),
    })),
  };
}
