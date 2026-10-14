import { routeHref } from "../lib/paths";
import {
  ShieldCheck,
  Upload,
  ScanLine,
  Sparkles,
  ChevronRight,
  Check,
  Heart,
  RotateCw,
  FlipHorizontal2,
  FlipVertical2,
} from "lucide-react";
import { type EditorController } from "../hooks/useEditor";
import { recommend } from "../engine/analysis";
import { initialEdit, type Adjustments } from "../engine/types";
import { AdjustmentGroup, AdjustmentSlider } from "./EditorControls";
import { EditedPhoto } from "./Photo";
import { Spinner } from "./UI";
export function EditorToolPanel({ editor }: { editor: EditorController }) {
  const {
    project,
    source,
    sourceUrl,
    states,
    index,
    edit,
    tool,
    setTool,
    setDirty,
    setProposal,
    measurements,
    photoType,
    setPhotoType,
    setRecommendations,
    favorites,
    styleSearch,
    setStyleSearch,
    intensity,
    selectedPreset,
    aiBusy,
    aiNotes,
    setConsent,
    input,
    commit,
    adjust,
    applyPreset,
    localAnalysis,
    applyAutoBalance,
    favorite,
    available,
    setIndex,
  } = editor;

  switch (tool) {
    case "upload":
      return (
        <>
          <div className="panel-notice">
            <ShieldCheck size={20} />
            <p>
              Your original stays untouched.
              <br />
              Edits happen on this device.
            </p>
          </div>
          <button
            className="button lime full"
            onClick={() => input.current?.click()}
          >
            <Upload size={16} /> Replace photo
          </button>
          <p className="tool-description">
            JPEG, PNG & WebP · up to 30 MB and 40 MP. Select up to 8 photos;
            each becomes a separate project.
          </p>
          <div className="file-details">
            <span>
              Original dimensions
              <b>
                {source?.width} × {source?.height}
              </b>
            </span>
            <span>
              File size
              <b>
                {((project?.original.size ?? 0) / 1024 / 1024).toFixed(2)} MB
              </b>
            </span>
            <span>
              Storage<b>This browser only</b>
            </span>
          </div>
        </>
      );
    case "analysis":
      return (
        <>
          <div className="tool-subheading">
            A useful second look <span className="local-tag">LOCAL</span>
          </div>
          <p className="tool-description">
            Measure pixels, not assumptions. Choose a photo type to tailor the
            suggestions; local analysis does not identify subjects.
          </p>
          <label className="field-label">
            Photo type
            <select
              value={photoType}
              onChange={(e) => {
                setPhotoType(e.target.value);
                if (measurements)
                  setRecommendations(recommend(measurements, e.target.value));
              }}
            >
              {["General", "Portrait", "Product", "Landscape"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <button className="button lime full" onClick={localAnalysis}>
            <ScanLine size={16} /> Analyze locally
          </button>
          <button className="button outline full" onClick={applyAutoBalance}>
            <Sparkles size={15} /> Auto balance light & color
          </button>
          {measurements && (
            <>
              <div className="metric-grid">
                {[
                  ["Brightness", measurements.brightness],
                  ["Contrast", measurements.contrast],
                  ["Saturation", measurements.saturation],
                ].map(([k, v]) => (
                  <div key={k}>
                    <strong>
                      {Math.round(+v)}
                      <small>%</small>
                    </strong>
                    <span>{k}</span>
                  </div>
                ))}
              </div>
              <ul className="insight-list">
                {measurements.observations.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
              <button
                className="button outline full"
                onClick={() => setTool("styles")}
              >
                See 15 suggested styles <ChevronRight size={15} />
              </button>
            </>
          )}
          <hr />
          <div className="tool-subheading">Go deeper with Gemini</div>
          <p className="tool-description">
            Optional AI observations about composition and lighting. Sends a
            reduced preview to your configured server and Google. Requires a
            server API key.
          </p>
          <button
            disabled={aiBusy}
            className="button outline full"
            onClick={() => setConsent("analyze")}
          >
            {aiBusy ? (
              <Spinner />
            ) : (
              <>
                <Sparkles size={15} /> Ask Gemini
              </>
            )}
          </button>
          <a
            className="text-button"
            style={{ marginTop: 12 }}
            href={routeHref("/account")}
            target="_blank"
            rel="noopener noreferrer"
          >
            Add or manage Gemini API key ↗
          </a>
          {aiNotes.length > 0 && (
            <>
              <span className="local-tag">SUBJECTIVE AI OBSERVATIONS</span>
              <ul className="insight-list">
                {aiNotes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </>
          )}
        </>
      );
    case "styles":
      return (
        <>
          <p className="tool-description">
            A starting point, not a finishing line.
            <br />
            Find a feeling and make it yours.
          </p>
          <input
            className="style-search"
            placeholder="Search all styles…"
            aria-label="Search editor styles"
            value={styleSearch}
            onChange={(e) => setStyleSearch(e.target.value)}
          />
          {selectedPreset && (
            <div className="intensity-control">
              <span>
                Style intensity <b>{intensity}%</b>
              </span>
              <input
                aria-label="Preset intensity"
                type="range"
                min="0"
                max="100"
                value={intensity}
                onChange={(e) => applyPreset(selectedPreset, +e.target.value)}
              />
            </div>
          )}
          <div className="editor-presets">
            {available.map((p) => (
              <div
                className={`editor-preset ${edit.preset === p.name ? "selected" : ""}`}
                key={p.id}
              >
                <button onClick={() => applyPreset(p)}>
                  <EditedPhoto
                    src={sourceUrl}
                    maxSize={240}
                    preset={p}
                    alt={`${p.name} on your photo`}
                  />
                  <span>
                    {p.name}
                    {edit.preset === p.name && <Check size={12} />}
                  </span>
                </button>
                <button
                  className="editor-favorite"
                  aria-label={`Favorite ${p.name}`}
                  onClick={() => favorite(p.id)}
                >
                  <Heart
                    size={12}
                    fill={favorites.includes(p.id) ? "currentColor" : "none"}
                  />
                </button>
              </div>
            ))}
          </div>
          <p className="tool-description">
            Presets replace adjustment values, but preserve your crop, rotation,
            and text.
          </p>
        </>
      );
    case "adjustments":
      return (
        <>
          <div className="tool-subheading">Light & tone</div>
          <AdjustmentGroup
            keys={[
              "exposure",
              "brightness",
              "contrast",
              "highlights",
              "shadows",
              "whites",
              "blacks",
              "gamma",
            ]}
            adjustments={edit.adjustments}
            onChange={adjust}
          />
          <hr />
          <div className="tool-subheading">Color & detail</div>
          <AdjustmentGroup
            keys={[
              "saturation",
              "vibrance",
              "sharpness",
              "clarity",
              "blur",
              "fade",
              "vignette",
              "grain",
            ]}
            adjustments={edit.adjustments}
            onChange={adjust}
          />
        </>
      );
    case "color":
      return (
        <>
          <div className="tool-subheading">Your signature palette</div>
          <AdjustmentGroup
            keys={[
              "temperature",
              "tint",
              "hue",
              "red",
              "green",
              "blue",
              "shadowTone",
              "highlightTone",
            ]}
            adjustments={edit.adjustments}
            onChange={adjust}
          />
          <p className="tool-description">
            Split toning: negative values add cool blue; positive values add
            warm amber. Weighted separately by shadow and highlight luminance.
          </p>
        </>
      );
    case "portrait":
    case "background":
      return (
        <>
          <div className="local-tag">MANUAL ELLIPTICAL MASK</div>
          <h3>
            {tool === "portrait" ? "A softer touch." : "A little separation."}
          </h3>
          <p className="tool-description">
            {tool === "portrait"
              ? "Gentle local smoothing inside a feathered ellipse. Position the mask yourself; this is not AI face detection or blemish removal."
              : "Blur outside a feathered ellipse. Position the sharp area over your subject. This is a manual focus effect, not automatic subject segmentation."}
          </p>
          <AdjustmentGroup
            keys={
              tool === "portrait"
                ? ["smoothing", "maskX", "maskY", "maskRadius"]
                : ["backgroundBlur", "maskX", "maskY", "maskRadius"]
            }
            adjustments={edit.adjustments}
            onChange={adjust}
          />
          <div className="panel-notice">
            {tool === "portrait"
              ? "Face-aware relighting, red-eye and targeted blemish correction are not available."
              : "Background removal, replacement and hair-edge refinement need a compatible segmentation model and are not available."}
          </div>
        </>
      );
    case "crop":
      return (
        <>
          <div className="tool-subheading">Give your story some space</div>
          <label className="field-label">
            Aspect ratio
            <select
              value={edit.crop}
              onChange={(e) => commit({ ...edit, crop: e.target.value })}
            >
              {[
                "original",
                "1:1",
                "4:5",
                "3:2",
                "2:3",
                "16:9",
                "9:16",
                "4:3",
              ].map((r) => (
                <option key={r} value={r}>
                  {r === "original" ? "Original ratio" : r}
                </option>
              ))}
            </select>
          </label>
          {edit.crop !== "original" && (
            <>
              <label className="field-label">
                Horizontal crop position
                <input
                  aria-label="Horizontal crop position"
                  type="range"
                  min="0"
                  max="100"
                  value={edit.cropX}
                  onChange={(e) => commit({ ...edit, cropX: +e.target.value })}
                />
              </label>
              <label className="field-label">
                Vertical crop position
                <input
                  aria-label="Vertical crop position"
                  type="range"
                  min="0"
                  max="100"
                  value={edit.cropY}
                  onChange={(e) => commit({ ...edit, cropY: +e.target.value })}
                />
              </label>
            </>
          )}
          <div className="transform-buttons">
            <button
              onClick={() =>
                commit({ ...edit, rotation: (edit.rotation + 90) % 360 })
              }
            >
              <RotateCw size={20} /> Rotate 90°
            </button>
            <button onClick={() => commit({ ...edit, flipX: !edit.flipX })}>
              <FlipHorizontal2 size={20} /> Flip horizontal
            </button>
            <button onClick={() => commit({ ...edit, flipY: !edit.flipY })}>
              <FlipVertical2 size={20} /> Flip vertical
            </button>
          </div>
          <button
            className="button outline full"
            onClick={() =>
              commit({
                ...edit,
                rotation: 0,
                flipX: false,
                flipY: false,
                crop: "original",
                cropX: 50,
                cropY: 50,
              })
            }
          >
            Reset transform
          </button>
        </>
      );
    case "text":
      return (
        <>
          <p className="tool-description">
            A simple, editable text overlay. Keep it short and let the photo
            speak.
          </p>
          <label className="field-label">
            Your text
            <input
              maxLength={120}
              placeholder="A moment worth keeping"
              value={edit.text}
              onChange={(e) => commit({ ...edit, text: e.target.value })}
            />
          </label>
          <label className="field-label">
            Text color
            <input
              type="color"
              value={edit.textColor}
              onChange={(e) => commit({ ...edit, textColor: e.target.value })}
            />
          </label>
          {(["textSize", "textX", "textY"] as const).map((k) => (
            <AdjustmentSlider
              key={k}
              name={k}
              value={edit.adjustments[k]}
              onChange={(v) => adjust({ [k]: v })}
            />
          ))}
          <button
            className="button outline full"
            onClick={() => commit({ ...edit, text: "" })}
          >
            Remove text
          </button>
        </>
      );
    case "history":
      return (
        <>
          <p className="tool-description">
            Up to 80 local snapshots. Click any step to restore its real editing
            parameters.
          </p>
          <div className="history-list">
            {states.map((s, i) => (
              <button
                key={i}
                className={index === i ? "active" : ""}
                onClick={() => {
                  setIndex(i);
                  setDirty(true);
                  setProposal(undefined);
                }}
              >
                <span>{String(i + 1).padStart(2, "0")}</span>
                <div>
                  {i === 0 ? "Starting point" : s.preset}
                  <small>
                    {
                      Object.entries(s.adjustments).filter(
                        ([k, v]) =>
                          v !==
                          initialEdit().adjustments[k as keyof Adjustments],
                      ).length
                    }{" "}
                    adjusted parameters
                  </small>
                </div>
                {index === i && <Check size={14} />}
              </button>
            ))}
          </div>
        </>
      );
  }
}
