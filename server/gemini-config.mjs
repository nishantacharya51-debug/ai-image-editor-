import { Router } from "express";
import { timingSafeEqual } from "node:crypto";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";

const configurationSchema = z
  .object({
    apiKey: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_-]{20,256}$/),
    model: z
      .string()
      .trim()
      .regex(/^gemini-[a-zA-Z0-9._-]{1,100}$/),
  })
  .strict();

/** Server memory only: never serializes a key into an HTTP response or file. */
export function createGeminiConfiguration({
  apiKey = "",
  model = "gemini-2.5-flash",
  setupToken = "",
} = {}) {
  const environment = { apiKey, model };
  let session = null;
  const current = () => session ?? environment;
  const status = () => ({
    configured: !!current().apiKey,
    model: current().model,
    keySource: session
      ? "session"
      : environment.apiKey
        ? "environment"
        : "none",
    setupEnabled: setupToken.length >= 24,
    environmentKeyPresent: !!environment.apiKey,
  });
  const router = Router();
  router.use(
    rateLimit({
      windowMs: 15 * 60_000,
      limit: 5,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: {
        error:
          "Too many configuration attempts. Wait 15 minutes before trying again.",
      },
    }),
  );
  router.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    if (setupToken.length < 24)
      return res
        .status(503)
        .json({
          error:
            "Browser setup is disabled. Ask the server owner to set PIXORA_SETUP_TOKEN (at least 24 characters) or configure GEMINI_API_KEY on the server.",
        });
    const candidate = req.get("x-pixora-setup-token") || "";
    const supplied = Buffer.from(candidate);
    const expected = Buffer.from(setupToken);
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    ) {
      return res
        .status(401)
        .json({
          error:
            "The server setup code is incorrect. Find it in the server terminal, or ask the server owner. No key was changed.",
        });
    }
    next();
  });
  router.put("/", (req, res) => {
    if (!req.is("application/json"))
      return res.status(415).json({ error: "Send the configuration as JSON." });
    const parsed = configurationSchema.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({
          error:
            "Enter a valid API key and a Gemini model ID. No configuration was changed.",
        });
    session = parsed.data;
    return res.json({
      ...status(),
      message:
        "Key saved in server memory for this server session. It has not been verified with Google.",
    });
  });
  router.delete("/", (_req, res) => {
    session = null;
    return res.json({
      ...status(),
      message: environment.apiKey
        ? "Session override cleared. The server environment key is active again."
        : "Session key cleared. Gemini is disconnected.",
    });
  });
  return { current, status, router };
}
