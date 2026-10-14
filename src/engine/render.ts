import type { Adjustments, EditState } from "./types";
let worker: Worker | undefined;
let seq = 0;
const jobs = new Map<
  number,
  { resolve: (d: Uint8ClampedArray) => void; reject: (e: Error) => void }
>();
function grade(data: ImageData, a: Adjustments): Promise<Uint8ClampedArray> {
  if (!worker) {
    worker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (e) => {
      jobs.get(e.data.id)?.resolve(new Uint8ClampedArray(e.data.buffer));
      jobs.delete(e.data.id);
    };
    worker.onerror = () => {
      jobs.forEach((j) =>
        j.reject(new Error("Image processor stopped. Please reload.")),
      );
      jobs.clear();
      worker?.terminate();
      worker = undefined;
    };
  }
  return new Promise((resolve, reject) => {
    const id = ++seq;
    jobs.set(id, { resolve, reject });
    worker!.postMessage(
      {
        id,
        buffer: data.data.buffer,
        width: data.width,
        height: data.height,
        adjustments: a,
      },
      [data.data.buffer],
    );
  });
}
const canvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
};
export async function renderImage(
  source: ImageBitmap | HTMLImageElement,
  edit: EditState,
  maxSize = 1400,
) {
  const sw = source.width,
    sh = source.height;
  const rad = (edit.rotation * Math.PI) / 180;
  const rw = Math.abs(sw * Math.cos(rad)) + Math.abs(sh * Math.sin(rad)),
    rh = Math.abs(sw * Math.sin(rad)) + Math.abs(sh * Math.cos(rad));
  const scale = Math.min(1, maxSize / Math.max(rw, rh));
  const rotated = canvas(rw * scale, rh * scale);
  const rc = rotated.getContext("2d")!;
  rc.translate(rotated.width / 2, rotated.height / 2);
  rc.rotate(rad);
  rc.scale(edit.flipX ? -1 : 1, edit.flipY ? -1 : 1);
  rc.drawImage(
    source,
    (-sw * scale) / 2,
    (-sh * scale) / 2,
    sw * scale,
    sh * scale,
  );
  let w = rotated.width,
    h = rotated.height;
  const ratio =
    edit.crop === "original"
      ? w / h
      : edit.crop
          .split(":")
          .map(Number)
          .reduce((a, b) => a / b);
  if (w / h > ratio) w = h * ratio;
  else h = w / ratio;
  const out = canvas(w, h);
  const ctx = out.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(
    rotated,
    ((rotated.width - w) * edit.cropX) / 100,
    ((rotated.height - h) * edit.cropY) / 100,
    w,
    h,
    0,
    0,
    out.width,
    out.height,
  );
  const pixels = ctx.getImageData(0, 0, out.width, out.height);
  const graded = await grade(pixels, edit.adjustments);
  ctx.putImageData(
    new ImageData(new Uint8ClampedArray(graded), out.width, out.height),
    0,
    0,
  );
  const a = edit.adjustments;
  if (a.sharpness || a.clarity) {
    const copy = canvas(out.width, out.height);
    const c = copy.getContext("2d")!;
    c.filter = `blur(${a.clarity ? 4 : 1}px)`;
    c.drawImage(out, 0, 0);
    const blurred = c.getImageData(0, 0, out.width, out.height).data;
    const original = ctx.getImageData(0, 0, out.width, out.height);
    const amount = a.sharpness / 100 + (a.clarity / 100) * 0.6;
    for (let i = 0; i < original.data.length; i += 4)
      for (let j = 0; j < 3; j++)
        original.data[i + j] +=
          (original.data[i + j] - blurred[i + j]) * amount;
    ctx.putImageData(original, 0, 0);
  }
  if (a.blur) {
    const copy = canvas(out.width, out.height);
    copy.getContext("2d")!.drawImage(out, 0, 0);
    ctx.filter = `blur(${(a.blur * out.width) / 1400}px)`;
    ctx.drawImage(copy, 0, 0);
    ctx.filter = "none";
  }
  // Manual elliptical mask: deterministic alternative, not face/subject segmentation.
  for (const effect of [
    {
      amount: a.smoothing / 18,
      opacity: (a.smoothing / 100) * 0.7,
      outside: false,
    },
    { amount: a.backgroundBlur, opacity: 1, outside: true },
  ]) {
    if (!effect.amount) continue;
    const layer = canvas(out.width, out.height);
    const lc = layer.getContext("2d")!;
    lc.filter = `blur(${(effect.amount * out.width) / 1400}px)`;
    lc.drawImage(out, 0, 0);
    lc.filter = "none";
    const mask = canvas(out.width, out.height);
    const mc = mask.getContext("2d")!;
    mc.translate((out.width * a.maskX) / 100, (out.height * a.maskY) / 100);
    mc.scale(1, out.height / out.width);
    const radius = (out.width * a.maskRadius) / 100;
    const gradient = mc.createRadialGradient(0, 0, radius * 0.55, 0, 0, radius);
    gradient.addColorStop(0, effect.outside ? "transparent" : "white");
    gradient.addColorStop(1, effect.outside ? "white" : "transparent");
    mc.fillStyle = gradient;
    mc.fillRect(-out.width * 2, -out.width * 2, out.width * 4, out.width * 4);
    lc.globalCompositeOperation = "destination-in";
    lc.drawImage(mask, 0, 0);
    ctx.globalAlpha = effect.opacity;
    ctx.drawImage(layer, 0, 0);
    ctx.globalAlpha = 1;
    layer.width = 1;
    mask.width = 1;
  }
  if (edit.text) {
    ctx.font = `500 ${(out.width * a.textSize) / 100}px system-ui`;
    ctx.textAlign = "center";
    ctx.fillStyle = edit.textColor;
    ctx.shadowColor = "#0006";
    ctx.shadowBlur = 4;
    ctx.fillText(
      edit.text,
      (out.width * a.textX) / 100,
      (out.height * a.textY) / 100,
      out.width * 0.95,
    );
  }
  rotated.width = 1;
  rotated.height = 1;
  return out;
}
export const toBlob = (
  c: HTMLCanvasElement,
  type = "image/png",
  quality = 0.92,
) =>
  new Promise<Blob>((resolve, reject) =>
    c.toBlob(
      (b) =>
        b ? resolve(b) : reject(new Error("Could not encode this image.")),
      type,
      quality,
    ),
  );
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
