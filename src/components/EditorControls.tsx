import { useEffect, useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import { BRAND } from "../lib/config";
import {
  type Adjustments,
  type AdjustmentKey,
  type EditState,
  ranges,
  defaults,
} from "../engine/types";
import { Modal, Spinner, useToast } from "./UI";
import { renderImage, toBlob, download } from "../engine/render";
import { getPreference, setPreference } from "../lib/storage";
export const labelFor = (key: string) =>
  key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
export function AdjustmentSlider({
  name,
  value,
  onChange,
}: {
  name: AdjustmentKey;
  value: number;
  onChange: (value: number) => void;
}) {
  const [min, max, step] = ranges[name];
  return (
    <div className="adjustment-slider">
      <div>
        <label htmlFor={`slider-${name}`}>{labelFor(name)}</label>
        <input
          aria-label={`${labelFor(name)} value`}
          type="number"
          value={Math.round(value * 100) / 100}
          min={min}
          max={max}
          step={step}
          onChange={(e) =>
            onChange(Math.max(min, Math.min(max, Number(e.target.value))))
          }
        />
      </div>
      <input
        id={`slider-${name}`}
        aria-label={labelFor(name)}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
      />
    </div>
  );
}
export function AdjustmentGroup({
  keys,
  adjustments,
  onChange,
}: {
  keys: AdjustmentKey[];
  adjustments: Adjustments;
  onChange: (patch: Partial<Adjustments>) => void;
}) {
  return (
    <>
      {keys.map((name) => (
        <AdjustmentSlider
          key={name}
          name={name}
          value={adjustments[name]}
          onChange={(value) => onChange({ [name]: value })}
        />
      ))}
      <button
        className="text-button"
        onClick={() =>
          onChange(Object.fromEntries(keys.map((k) => [k, defaults[k]])))
        }
      >
        <RotateCcw size={13} /> Reset this tool
      </button>
    </>
  );
}
export function ExportModal({
  source,
  edit,
  name,
  preview,
  onClose,
}: {
  source: ImageBitmap;
  edit: EditState;
  name: string;
  preview: string;
  onClose: () => void;
}) {
  const [format, setFormat] = useState("image/jpeg");
  const [quality, setQuality] = useState(0.92);
  const [size, setSize] = useState("original");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const toast = useToast();
  useEffect(() => {
    getPreference("exportFormat", "image/jpeg")
      .then(setFormat)
      .catch(() => {});
  }, []);
  async function exportImage() {
    setBusy(true);
    setResult("Rendering your full-resolution edit…");
    try {
      const c = await renderImage(
        source,
        edit,
        size === "original"
          ? Math.max(source.width, source.height) * 1.5
          : +size,
      );
      if (format === "image/jpeg") {
        const ctx = c.getContext("2d")!;
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, c.width, c.height);
      }
      const blob = await toBlob(c, format, quality);
      download(
        blob,
        `${name.replace(/[^a-z0-9_-]/gi, "-")}-${BRAND.exportSlug}.${format === "image/png" ? "png" : "jpg"}`,
      );
      setResult(
        `Downloaded ${c.width} × ${c.height} · ${(blob.size / 1024 / 1024).toFixed(2)} MB`,
      );
      setPreference("exportFormat", format).catch(() => {});
      toast("Your photo is ready. Download started.");
    } catch (e) {
      setResult("Export failed. Try a smaller output size.");
      toast(e instanceof Error ? e.message : "Export failed.", true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Your vision, ready to go."
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <img className="export-preview" src={preview} alt="Export preview" />
      <p className="muted">
        Your original stays untouched. Take your finished edit with you.
      </p>
      <div className="form-row">
        <label>
          File format
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="image/jpeg">JPEG · smaller file</option>
            <option value="image/png">
              PNG · lossless, supports transparency
            </option>
          </select>
        </label>
      </div>
      {format === "image/jpeg" && (
        <label className="form-row">
          JPEG quality · {Math.round(quality * 100)}%
          <input
            aria-label="JPEG quality"
            type="range"
            min="0.2"
            max="1"
            step="0.01"
            value={quality}
            onChange={(e) => setQuality(+e.target.value)}
          />
        </label>
      )}
      <div className="form-row">
        <label>
          Resolution
          <select value={size} onChange={(e) => setSize(e.target.value)}>
            <option value="original">
              Full resolution · original {source.width} × {source.height}
            </option>
            <option value="2048">Up to 2048 px · sharing</option>
            <option value="1200">Up to 1200 px · web</option>
          </select>
        </label>
      </div>
      <div className="notice">
        Crops and rotation change dimensions. Smaller photos are never upscaled.
        JPEG transparency is filled with white.
      </div>
      {result && (
        <p role="status" className="export-result">
          {result}
        </p>
      )}
      <button
        className="button dark full"
        disabled={busy}
        onClick={exportImage}
      >
        {busy ? (
          <Spinner label="Preparing export…" />
        ) : (
          <>
            <Download size={17} /> Download photo
          </>
        )}
      </button>
    </Modal>
  );
}
