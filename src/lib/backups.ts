import { zip, unzip, strToU8, strFromU8 } from "fflate";
import { z } from "zod";
import {
  initialEdit,
  validateAdjustments,
  type EditState,
  type Project,
  type Preset,
} from "../engine/types";
import { decodeImage } from "./images";
import { renderImage, toBlob, download } from "../engine/render";
import { BRAND } from "./config";
const editSchema = z.object({
  adjustments: z.record(z.unknown()),
  rotation: z.union([
    z.literal(0),
    z.literal(90),
    z.literal(180),
    z.literal(270),
  ]),
  flipX: z.boolean(),
  flipY: z.boolean(),
  crop: z.enum(["original", "1:1", "4:5", "3:2", "2:3", "16:9", "9:16", "4:3"]),
  cropX: z.number().finite().min(0).max(100),
  cropY: z.number().finite().min(0).max(100),
  text: z.string().max(120),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  preset: z.string().max(100),
});
export function validateEdit(input: unknown): EditState {
  const parsed = editSchema.parse(input);
  return {
    ...parsed,
    adjustments: {
      ...initialEdit().adjustments,
      ...validateAdjustments(parsed.adjustments),
    },
  };
}
const manifestSchema = z.object({
  format: z.literal("acharya-project"),
  version: z.literal(1),
  name: z.string().min(1).max(100),
  mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
  edit: z.unknown(),
  history: z.array(z.unknown()).max(80),
  favorite: z.boolean(),
});
export async function exportProjectBackup(project: Project) {
  const metadata = {
    format: "acharya-project",
    version: 1,
    name: project.name.slice(0, 100) || "Untitled photo",
    mime: project.original.type,
    edit: project.edit,
    history: project.history,
    favorite: project.favorite,
  };
  const original = new Uint8Array(await project.original.arrayBuffer());
  const archive = await new Promise<Uint8Array>((resolve, reject) =>
    zip(
      {
        "manifest.json": strToU8(JSON.stringify(metadata)),
        "original.image": original,
      },
      { level: 0 },
      (error, result) => (error ? reject(error) : resolve(result)),
    ),
  );
  download(
    new Blob([new Uint8Array(archive)], { type: "application/zip" }),
    `${project.name.replace(/[^a-z0-9_-]/gi, "-") || "photo"}-${BRAND.exportSlug}.acharya`,
  );
}
export async function restoreProjectBackup(file: File): Promise<Project> {
  if (file.size > 40 * 1024 * 1024)
    throw new Error("Project backups must be smaller than 40 MB.");
  const input = new Uint8Array(await file.arrayBuffer());
  const files = await new Promise<Record<string, Uint8Array>>(
    (resolve, reject) =>
      unzip(
        input,
        {
          filter: (entry) =>
            entry.name === "manifest.json"
              ? entry.originalSize <= 512 * 1024
              : entry.name === "original.image" &&
                entry.originalSize <= 30 * 1024 * 1024,
        },
        (error, result) =>
          error
            ? reject(new Error("This backup could not be opened."))
            : resolve(result),
      ),
  );
  if (!files["manifest.json"] || !files["original.image"])
    throw new Error(
      "This is not a supported Acharya project backup, or it exceeds the size limits.",
    );
  let metadata: z.infer<typeof manifestSchema>;
  try {
    metadata = manifestSchema.parse(
      JSON.parse(strFromU8(files["manifest.json"])),
    );
  } catch {
    throw new Error("The backup metadata is invalid or unsupported.");
  }
  const edit = validateEdit(metadata.edit);
  const history = metadata.history.map(validateEdit);
  if (
    !history.length ||
    JSON.stringify(history.at(-1)) !== JSON.stringify(edit)
  )
    history.push(edit);
  const original = new Blob([new Uint8Array(files["original.image"])], {
    type: metadata.mime,
  });
  const bitmap = await decodeImage(original);
  try {
    const thumbnail = await toBlob(
      await renderImage(bitmap, edit, 360),
      "image/jpeg",
      0.8,
    );
    return {
      id: crypto.randomUUID(),
      name: `${metadata.name.slice(0, 85)} — restored`,
      original,
      thumbnail,
      edit,
      history: history.slice(-80),
      favorite: metadata.favorite,
      width: bitmap.width,
      height: bitmap.height,
      created: Date.now(),
      updated: Date.now(),
    };
  } finally {
    bitmap.close();
  }
}
export function exportRecipe(preset: Preset) {
  const content = {
    format: "acharya-look",
    version: 1,
    name: preset.name,
    description: preset.description,
    adjustments: preset.adjustments,
  };
  download(
    new Blob([JSON.stringify(content, null, 2)], { type: "application/json" }),
    `${preset.name.replace(/[^a-z0-9_-]/gi, "-")}.acharya-look.json`,
  );
}
export async function importRecipe(file: File): Promise<Preset> {
  if (file.size > 64 * 1024)
    throw new Error("A recipe file must be under 64 KB.");
  const schema = z.object({
    format: z.literal("acharya-look"),
    version: z.literal(1),
    name: z.string().min(1).max(60),
    description: z.string().max(500).default("Imported creative recipe."),
    adjustments: z.record(z.unknown()),
  });
  let data;
  try {
    data = schema.parse(JSON.parse(await file.text()));
  } catch {
    throw new Error("Choose a valid Acharya recipe JSON file.");
  }
  const adjustments = validateAdjustments(data.adjustments);
  if (!Object.keys(adjustments).length)
    throw new Error("The recipe contains no supported numeric adjustments.");
  return {
    id: crypto.randomUUID(),
    name: data.name,
    description: data.description,
    category: "Custom",
    image: "alpine",
    adjustments,
  };
}
