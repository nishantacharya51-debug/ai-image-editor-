import { routeHref } from "../lib/paths";
import { assetUrl } from "../lib/paths";
import { type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { initialEdit, type Adjustments, type Preset } from "../engine/types";
import { presets } from "../data/presets";
import { sampleBlob } from "../lib/images";
import { getPreference, setPreference } from "../lib/storage";
import { ExportModal } from "../components/EditorControls";
import { Modal, Spinner } from "../components/UI";
import { Comparison } from "../components/Photo";
import { EditorToolPanel } from "../components/EditorToolPanel";
import { useEditor } from "../hooks/useEditor";
import { BRAND } from "../lib/config";
import {
  Upload,
  ScanLine,
  Sparkles,
  SlidersHorizontal,
  UserRound,
  Mountain,
  Palette,
  Crop,
  Type,
  History,
  ArrowLeft,
  Undo2,
  Redo2,
  Columns2,
  Download,
  Save,
  MoreHorizontal,
  ZoomIn,
  ZoomOut,
  Maximize,
  X,
  Check,
  WandSparkles,
  ImagePlus,
  ChevronRight,
  ShieldCheck,
  Copy,
  ClipboardPaste,
  PanelRightClose,
  Settings2,
} from "lucide-react";
const tools = [
  { id: "upload", label: "Upload", icon: Upload },
  { id: "analysis", label: "AI Analysis", icon: ScanLine },
  { id: "styles", label: "Styles", icon: Sparkles },
  { id: "adjustments", label: "Adjustments", icon: SlidersHorizontal },
  { id: "portrait", label: "Portrait", icon: UserRound },
  { id: "background", label: "Background", icon: Mountain },
  { id: "color", label: "Color Grading", icon: Palette },
  { id: "crop", label: "Crop & Transform", icon: Crop },
  { id: "text", label: "Text & Overlays", icon: Type },
  { id: "history", label: "History", icon: History },
];
export default function Editor() {
  const editor = useEditor();
  const {
    toast,
    project,
    setProject,
    source,
    sourceUrl,
    preview,
    originalPreview,
    states,
    index,
    edit,
    tool,
    setTool,
    panel,
    setPanel,
    processing,
    loading,
    error,
    setError,
    dirty,
    setDirty,
    exporting,
    setExporting,
    more,
    setMore,
    compare,
    setCompare,
    before,
    setBefore,
    zoom,
    setZoom,
    pan,
    setPan,
    drag,
    prompt,
    setPrompt,
    useGemini,
    setUseGemini,
    aiBusy,
    proposal,
    setProposal,
    consent,
    setConsent,
    presetName,
    setPresetName,
    customPresets,
    setCustomPresets,
    input,
    commit,
    adjust,
    importFiles,
    save,
    runAI,
    promptPreview,
    setIndex,
    setSelectedPreset,
  } = editor;
  return (
    <div className="editor-shell">
      <input
        ref={input}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          void importFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      <header className="editor-topbar">
        <div className="editor-title">
          <Link
            to="/projects"
            className="icon-button"
            aria-label="Back to projects"
            onClick={(e) => {
              if (
                dirty &&
                !window.confirm("Leave without saving these changes?")
              )
                e.preventDefault();
            }}
          >
            <ArrowLeft size={19} />
          </Link>
          <span className="editor-brand">
            <img
              src={BRAND.logo}
              alt={`${BRAND.full} logo`}
              width={34}
              height={34}
            />
          </span>
          {project ? (
            <input
              aria-label="Project name"
              value={project.name}
              onChange={(e) => {
                setProject({ ...project, name: e.target.value });
                setDirty(true);
              }}
            />
          ) : (
            <span>Untitled workspace</span>
          )}
          <span className="save-status">
            {dirty
              ? "Unsaved changes"
              : project
                ? "Saved locally"
                : "LOCAL STUDIO"}
          </span>
        </div>
        <div className="editor-top-actions">
          <button
            className="icon-button"
            aria-label="Undo"
            disabled={index === 0}
            onClick={() => {
              setIndex(index - 1);
              setDirty(true);
              setProposal(undefined);
            }}
          >
            <Undo2 size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Redo"
            disabled={index === states.length - 1}
            onClick={() => {
              setIndex(index + 1);
              setDirty(true);
              setProposal(undefined);
            }}
          >
            <Redo2 size={18} />
          </button>
          <span className="toolbar-divider" />
          <button
            className={`button editor-quiet ${compare ? "active" : ""}`}
            disabled={!source}
            onClick={() => setCompare(!compare)}
          >
            <Columns2 size={16} />
            <span>Compare</span>
          </button>
          <button
            className="button editor-quiet"
            disabled={!source}
            onClick={save}
          >
            <Save size={16} />
            <span>Save</span>
          </button>
          <button
            className="button lime small"
            disabled={!source || !!proposal}
            title={
              proposal
                ? "Apply or cancel the proposed adjustments before exporting"
                : "Export your current edit"
            }
            onClick={() => setExporting(true)}
          >
            <Download size={15} />
            <span>Export</span>
          </button>
          <div className="more-wrap">
            <button
              className="icon-button"
              aria-label="More options"
              onClick={() => setMore(!more)}
            >
              <MoreHorizontal size={20} />
            </button>
            {more && (
              <div className="dropdown">
                <button
                  disabled={!source}
                  onClick={() => {
                    commit(initialEdit());
                    setMore(false);
                    setSelectedPreset(undefined);
                  }}
                >
                  Reset all edits
                </button>
                <button
                  disabled={!source}
                  onClick={() => {
                    setPresetName("My custom look");
                    setMore(false);
                  }}
                >
                  Save as preset
                </button>
                <button
                  disabled={!source}
                  onClick={async () => {
                    try {
                      await setPreference(
                        "copiedAdjustments",
                        edit.adjustments,
                      );
                      toast("Adjustments copied within this browser.");
                      setMore(false);
                    } catch {
                      toast("Could not copy adjustments.", true);
                    }
                  }}
                >
                  <Copy size={14} /> Copy adjustments
                </button>
                <button
                  disabled={!source}
                  onClick={async () => {
                    const a = await getPreference<Adjustments | null>(
                      "copiedAdjustments",
                      null,
                    );
                    if (a) {
                      adjust(a);
                      toast("Adjustments pasted.");
                    } else toast("Copy some adjustments first.", true);
                    setMore(false);
                  }}
                >
                  <ClipboardPaste size={14} /> Paste adjustments
                </button>
                <Link to="/settings">Preferences</Link>
                <Link to="/help">Help & shortcuts</Link>
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="editor-body">
        <aside className="tool-rail" aria-label="Editing tools">
          {tools.map((t) => (
            <button
              key={t.id}
              className={tool === t.id && panel ? "active" : ""}
              onClick={() => {
                setTool(t.id);
                setPanel(true);
              }}
              title={t.label}
            >
              <t.icon size={20} />
              <span>{t.label}</span>
            </button>
          ))}
          <Link to="/help" className="rail-help" aria-label="Editing help">
            ?
          </Link>
        </aside>
        <main
          className="canvas-area"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void importFiles(Array.from(e.dataTransfer.files));
          }}
        >
          <div className="canvas-toolbar">
            <span>
              {source ? (
                <>
                  <i className="status-dot" />{" "}
                  {before
                    ? "ORIGINAL"
                    : proposal
                      ? "PROPOSED EDIT"
                      : "YOUR CREATIVE WORKSPACE"}
                </>
              ) : (
                "A BLANK CANVAS. ENDLESS POSSIBILITIES."
              )}
            </span>
            <div>
              {processing && <Spinner label="Rendering" />}
              {source && (
                <button
                  onClick={() => setBefore(!before)}
                  className={before ? "active" : ""}
                >
                  Original <span>B</span>
                </button>
              )}
              <button
                className="icon-button"
                aria-label="Toggle settings panel"
                onClick={() => setPanel(!panel)}
              >
                <Settings2 size={16} />
              </button>
            </div>
          </div>
          {error && (
            <div className="editor-error" role="alert">
              <span>{error}</span>
              <button
                onClick={() => {
                  setError("");
                  input.current?.click();
                }}
              >
                Try another photo
              </button>
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={15} />
              </button>
            </div>
          )}
          {!source ? (
            <div className="upload-empty">
              <div className="upload-art">
                <ImagePlus size={42} />
                <span>✦</span>
              </div>
              <span className="eyebrow">IT STARTS WITH YOUR PHOTO</span>
              <h1>What will you create today?</h1>
              <p>Drop a photo here. Find a new perspective.</p>
              <button
                disabled={loading}
                className="button lime"
                onClick={() => input.current?.click()}
              >
                {loading ? (
                  <Spinner label="Opening photo…" />
                ) : (
                  <>
                    <Upload size={17} /> Choose a photo
                  </>
                )}
              </button>
              <span className="upload-formats">
                JPEG, PNG, WebP · Max 30 MB / 40 MP
              </span>
              <div className="try-demo">
                <span>Just looking around?</span>
                <button
                  disabled={loading}
                  onClick={() =>
                    sampleBlob()
                      .then((b) => importFiles([b], true))
                      .catch((e) => setError(e.message))
                  }
                >
                  <img
                    src={assetUrl("images/alpine.jpg")}
                    alt="Alpine lake example"
                  />{" "}
                  Try an example <ChevronRight size={15} />
                </button>
              </div>
              <p className="upload-privacy">
                <ShieldCheck size={14} /> Private by default. Your photos stay
                on your device.
              </p>
            </div>
          ) : (
            <>
              <div
                className="canvas-viewport"
                onPointerDown={(e) => {
                  if (zoom <= 100 || compare) return;
                  drag.current = {
                    x: e.clientX,
                    y: e.clientY,
                    px: pan.x,
                    py: pan.y,
                  };
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (drag.current)
                    setPan({
                      x: drag.current.px + e.clientX - drag.current.x,
                      y: drag.current.py + e.clientY - drag.current.y,
                    });
                }}
                onPointerUp={() => (drag.current = null)}
                style={{ cursor: zoom > 100 ? "grab" : undefined }}
              >
                <div
                  className="canvas-photo"
                  style={{
                    transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom / 100})`,
                  }}
                >
                  {preview ? (
                    compare ? (
                      <Comparison
                        original={originalPreview || sourceUrl}
                        edited={preview}
                      />
                    ) : (
                      <img
                        src={before ? originalPreview || sourceUrl : preview}
                        alt={before ? "Original photo" : "Edited photo preview"}
                        draggable={false}
                      />
                    )
                  ) : (
                    <Spinner label="Preparing your canvas…" />
                  )}
                </div>
                {before && (
                  <span className="canvas-original-badge">
                    ORIGINAL · NO ADJUSTMENTS
                  </span>
                )}
              </div>
              <div className="zoom-toolbar">
                <button
                  className="icon-button"
                  aria-label="Zoom out"
                  onClick={() => setZoom(Math.max(25, zoom - 25))}
                >
                  <ZoomOut size={16} />
                </button>
                <span>{zoom}%</span>
                <button
                  className="icon-button"
                  aria-label="Zoom in"
                  onClick={() => setZoom(Math.min(300, zoom + 25))}
                >
                  <ZoomIn size={16} />
                </button>
                <span className="toolbar-divider" />
                <button
                  className="icon-button"
                  aria-label="Fit to screen"
                  onClick={() => {
                    setZoom(100);
                    setPan({ x: 0, y: 0 });
                  }}
                >
                  <Maximize size={15} />
                </button>
                <span className="zoom-dimensions">
                  {source.width} × {source.height}
                </span>
              </div>
            </>
          )}
          {source && (
            <div className="canvas-bottom">
              <div className="canvas-thumb">
                <img src={sourceUrl} alt="Original thumbnail" />
                <div>
                  <span>{project?.name}</span>
                  <small>ORIGINAL PRESERVED</small>
                </div>
              </div>
              <span>
                <i className="status-dot" />
                {edit.preset}
              </span>
              <button onClick={() => setTool("history")}>
                <History size={14} /> {index} edits
              </button>
            </div>
          )}
        </main>
        {panel && (
          <aside className="editor-panel">
            <div className="panel-heading">
              <h2>{tools.find((t) => t.id === tool)?.label}</h2>
              <button
                className="icon-button"
                aria-label="Close tool panel"
                onClick={() => setPanel(false)}
              >
                <PanelRightClose size={17} />
              </button>
            </div>
            <div className="panel-content">
              {source ? (
                <EditorToolPanel editor={editor} />
              ) : (
                <div className="panel-empty">
                  <Sparkles size={30} />
                  <h3>Room for your imagination.</h3>
                  <p>
                    Upload a photo to explore creative styles, fine-tune the
                    light, and find your signature look.
                  </p>
                  <div className="empty-styles">
                    {presets.slice(0, 4).map((p) => (
                      <div key={p.id}>
                        <img src={assetUrl(`images/${p.image}.jpg`)} alt="" />
                        <span>{p.name}</span>
                      </div>
                    ))}
                  </div>
                  <div className="panel-notice">
                    <ShieldCheck size={18} /> Non-destructive. Free. Yours.
                  </div>
                </div>
              )}
            </div>
            {source && (
              <div className="prompt-panel">
                <div>
                  <WandSparkles size={15} />
                  <strong>Describe your vision</strong>
                  <span>{useGemini ? "GEMINI" : "LOCAL"}</span>
                </div>
                <textarea
                  aria-label="Editing prompt"
                  placeholder="Warmer tones, softer shadows…"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  maxLength={2000}
                />
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={useGemini}
                    onChange={(e) => setUseGemini(e.target.checked)}
                  />{" "}
                  Use Gemini (sends preview after consent)
                </label>
                {proposal ? (
                  <div className="proposal">
                    <p>{proposal.explanation}</p>
                    <div>
                      <button
                        className="button lime small"
                        onClick={() => {
                          commit({
                            ...edit,
                            adjustments: {
                              ...edit.adjustments,
                              ...proposal.adjustments,
                            },
                            preset: "Prompt edit",
                          });
                          toast("Suggested adjustments applied.");
                        }}
                      >
                        <Check size={14} /> Apply
                      </button>
                      <button
                        className="button editor-quiet small"
                        onClick={() => setProposal(undefined)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    disabled={aiBusy || !prompt.trim()}
                    className="button outline full"
                    onClick={promptPreview}
                  >
                    {aiBusy ? (
                      <Spinner />
                    ) : (
                      <>
                        Preview adjustments <WandSparkles size={14} />
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </aside>
        )}
      </div>
      {exporting && source && (
        <ExportModal
          source={source}
          edit={edit}
          name={project?.name || "photo"}
          preview={preview}
          onClose={() => setExporting(false)}
        />
      )}{" "}
      {consent && (
        <Modal
          title="Invite a second perspective?"
          onClose={() => setConsent(null)}
        >
          <p>
            This explicitly sends a reduced-size copy of your photo (up to 768
            px), your prompt, and current settings to the configured server and
            Google Gemini.
          </p>
          <p className="muted">
            Google’s API data terms apply. Free-tier data handling may differ
            from paid services. Avoid sending sensitive photos. Local editing
            never needs this.
          </p>
          <div className="notice">
            Requires a server-side API key. Quotas and model availability are
            controlled by your Google account.
          </div>
          <a
            className="text-link"
            href={routeHref("/account")}
            target="_blank"
            rel="noopener noreferrer"
          >
            Add or manage your Gemini API key ↗
          </a>
          <button className="button dark full" onClick={() => runAI(consent)}>
            Send preview & continue <Sparkles size={16} />
          </button>
          <button
            className="button outline full"
            onClick={() => setConsent(null)}
          >
            Keep editing locally
          </button>
        </Modal>
      )}
      {presetName !== null && (
        <Modal
          title="Save your signature look"
          onClose={() => setPresetName(null)}
        >
          <label className="form-row">
            Preset name
            <input
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              maxLength={60}
            />
          </label>
          <button
            className="button dark full"
            onClick={async () => {
              try {
                if (!presetName.trim()) return;
                const p: Preset = {
                  id: crypto.randomUUID(),
                  name: presetName.trim(),
                  description: "Your custom adjustment recipe.",
                  category: "Custom",
                  adjustments: { ...edit.adjustments },
                  image: "alpine",
                };
                const list = [...customPresets, p];
                await setPreference("customPresets", list);
                setCustomPresets(list);
                setPresetName(null);
                toast("Custom preset saved to your library.");
              } catch {
                toast("Could not save the preset.", true);
              }
            }}
          >
            Save preset
          </button>
        </Modal>
      )}
    </div>
  );
}
