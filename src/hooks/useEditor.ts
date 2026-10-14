import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  initialEdit,
  type EditState,
  type Project,
  type Adjustments,
  type Preset,
} from "../engine/types";
import { presets } from "../data/presets";
import { decodeImage, sampleBlob } from "../lib/images";
import {
  getProject,
  putProject,
  getPreference,
  setPreference,
  getCustomPresets,
} from "../lib/storage";
import { renderImage, toBlob } from "../engine/render";
import {
  measure,
  autoBalance,
  recommend,
  parseLocalPrompt,
  type Measurements,
} from "../engine/analysis";
import { askAI } from "../lib/ai";
import { useToast } from "../components/UI";
export function useEditor() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const toast = useToast();
  const [project, setProject] = useState<Project>();
  const [source, setSource] = useState<ImageBitmap>();
  const [sourceUrl, setSourceUrl] = useState("");
  const [preview, setPreview] = useState("");
  const [originalPreview, setOriginalPreview] = useState("");
  const [states, setStates] = useState<EditState[]>([initialEdit()]);
  const [index, setIndex] = useState(0);
  const edit = states[index] ?? states[0];
  const [tool, setTool] = useState("styles");
  const [panel, setPanel] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [more, setMore] = useState(false);
  const [compare, setCompare] = useState(false);
  const [before, setBefore] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(
    null,
  );
  const [measurements, setMeasurements] = useState<Measurements>();
  const [photoType, setPhotoType] = useState("General");
  const [recommendations, setRecommendations] = useState<Preset[]>(
    presets.slice(0, 15),
  );
  const [favorites, setFavorites] = useState<string[]>([]);
  const [styleSearch, setStyleSearch] = useState("");
  const [intensity, setIntensity] = useState(100);
  const [selectedPreset, setSelectedPreset] = useState<Preset>();
  const [prompt, setPrompt] = useState("");
  const [useGemini, setUseGemini] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [proposal, setProposal] = useState<{
    adjustments: Partial<Adjustments>;
    explanation: string;
  }>();
  const [aiNotes, setAiNotes] = useState<string[]>([]);
  const [consent, setConsent] = useState<"analyze" | "prompt" | null>(null);
  const [presetName, setPresetName] = useState<string | null>(null);
  const [customPresets, setCustomPresets] = useState<Preset[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const pendingPreset = useRef(params.get("preset"));
  const loadedId = useRef<string | undefined>(undefined);
  const currentSource = useRef<ImageBitmap | undefined>(undefined);
  const latestRender = useRef(0);
  const imageGeneration = useRef(0);
  const commit = useCallback(
    (next: EditState) => {
      setStates((s) => [...s.slice(0, index + 1), next].slice(-80));
      setIndex(Math.min(index + 1, 79));
      setDirty(true);
      setProposal(undefined);
    },
    [index],
  );
  const adjust = (patch: Partial<Adjustments>) =>
    commit({
      ...edit,
      adjustments: { ...edit.adjustments, ...patch },
      preset: "Custom",
    });
  function applyPreset(p: Preset, amount = 100) {
    setSelectedPreset(p);
    setIntensity(amount);
    const a = { ...initialEdit().adjustments };
    for (const key of Object.keys(p.adjustments) as (keyof Adjustments)[])
      a[key] =
        a[key] + (((p.adjustments[key] ?? a[key]) - a[key]) * amount) / 100;
    commit({ ...edit, adjustments: a, preset: p.name });
    toast(`${p.name} applied. Every adjustment is editable.`);
  }
  async function activate(p: Project) {
    imageGeneration.current++;
    const bitmap = await decodeImage(p.original);
    currentSource.current?.close();
    currentSource.current = bitmap;
    setSource(bitmap);
    setSourceUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(p.original);
    });
    setProject(p);
    let state = p.edit;
    const preset = [...presets, ...(await getCustomPresets())].find(
      (v) => v.id === pendingPreset.current,
    );
    if (preset) {
      state = {
        ...state,
        adjustments: { ...state.adjustments, ...preset.adjustments },
        preset: preset.name,
      };
      setSelectedPreset(preset);
      pendingPreset.current = null;
      setDirty(true);
    } else setDirty(false);
    setStates(p.history?.length && !preset ? p.history : [state]);
    setIndex(p.history?.length && !preset ? p.history.length - 1 : 0);
    setProposal(undefined);
    setPreview("");
    setOriginalPreview("");
    setZoom(100);
    setPan({ x: 0, y: 0 });
    setMeasurements(undefined);
    setAiNotes([]);
    setError("");
  }
  useEffect(() => {
    getPreference<string[]>("favorites", [])
      .then(setFavorites)
      .catch(() => {});
    getCustomPresets()
      .then(setCustomPresets)
      .catch(() => {});
    return () => {
      currentSource.current?.close();
    };
  }, []);
  useEffect(() => {
    if (!projectId || loadedId.current === projectId) return;
    let live = true;
    setLoading(true);
    getProject(projectId)
      .then(async (p) => {
        if (!p)
          throw new Error("This project is not available in this browser.");
        if (live) {
          await activate(p);
          loadedId.current = projectId;
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [projectId]); // project identity is the only load trigger
  useEffect(
    () => () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    },
    [sourceUrl],
  );
  async function importFiles(files: File[] | Blob[], demo = false) {
    if (!files.length) return;
    if (
      dirty &&
      !window.confirm("Replace this photo? Unsaved changes will be lost.")
    )
      return;
    setLoading(true);
    setError("");
    try {
      let first: Project | undefined;
      for (const file of files.slice(0, 8)) {
        const image = await decodeImage(file);
        const c = await renderImage(image, initialEdit(), 360);
        const p: Project = {
          id: crypto.randomUUID(),
          name: demo
            ? "Dolomites — a new perspective"
            : file instanceof File
              ? file.name.replace(/\.[^.]+$/, "")
              : "Untitled photo",
          original: file,
          thumbnail: await toBlob(c, "image/jpeg", 0.7),
          width: image.width,
          height: image.height,
          edit: initialEdit(),
          history: [initialEdit()],
          created: Date.now(),
          updated: Date.now(),
          favorite: false,
        };
        image.close();
        await putProject(p);
        first ??= p;
      }
      if (first) {
        loadedId.current = first.id;
        await activate(first);
        navigate(`/editor/${first.id}`, { replace: true });
        setTool("styles");
        toast(
          files.length > 1
            ? `${Math.min(8, files.length)} photos added to your projects.`
            : "Photo ready. Find your starting point.",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not import this photo.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (params.get("demo") === "1" && !projectId) {
      sampleBlob()
        .then((b) => importFiles([b], true))
        .catch((e) => setError(e.message));
    }
  }, []);
  useEffect(() => {
    const paste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length) void importFiles(files);
    };
    window.addEventListener("paste", paste);
    return () => window.removeEventListener("paste", paste);
  });
  useEffect(() => {
    if (!source) return;
    const id = ++latestRender.current;
    setProcessing(true);
    const timer = setTimeout(async () => {
      try {
        const active = proposal
          ? {
              ...edit,
              adjustments: { ...edit.adjustments, ...proposal.adjustments },
            }
          : edit;
        const output = await renderImage(source, active, 1400);
        const blob = await toBlob(output);
        if (id === latestRender.current)
          setPreview((old) => {
            if (old) URL.revokeObjectURL(old);
            return URL.createObjectURL(blob);
          });
        const original = await renderImage(
          source,
          {
            ...initialEdit(),
            rotation: edit.rotation,
            flipX: edit.flipX,
            flipY: edit.flipY,
            crop: edit.crop,
            cropX: edit.cropX,
            cropY: edit.cropY,
          },
          1400,
        );
        const ob = await toBlob(original);
        if (id === latestRender.current)
          setOriginalPreview((old) => {
            if (old) URL.revokeObjectURL(old);
            return URL.createObjectURL(ob);
          });
      } catch (e) {
        if (id === latestRender.current)
          setError(e instanceof Error ? e.message : "Preview failed.");
      } finally {
        if (id === latestRender.current) setProcessing(false);
      }
    }, 80);
    return () => {
      clearTimeout(timer);
      latestRender.current++;
    };
  }, [source, edit, proposal]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  useEffect(
    () => () => {
      if (originalPreview) URL.revokeObjectURL(originalPreview);
    },
    [originalPreview],
  );
  async function save() {
    if (!source || !project) return;
    try {
      const c = await renderImage(source, edit, 360);
      const p = {
        ...project,
        edit,
        history: states.slice(0, index + 1),
        thumbnail: await toBlob(c, "image/jpeg", 0.75),
        updated: Date.now(),
      };
      await putProject(p);
      setProject(p);
      setDirty(false);
      toast("Project saved on this device.");
    } catch {
      toast(
        "Could not save. Your browser storage may be full. Export a copy.",
        true,
      );
    }
  }
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        void save();
        return;
      }
      if (
        e.target instanceof HTMLElement &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)
      )
        return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        setIndex((i) =>
          Math.max(0, Math.min(states.length - 1, i + (e.shiftKey ? 1 : -1))),
        );
        setDirty(true);
        setProposal(undefined);
      }
      if (e.key === "b") setBefore((v) => !v);
      if (e.key === "Escape") {
        setBefore(false);
        setCompare(false);
        setProposal(undefined);
      }
    };
    const unload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("keydown", handler);
    window.addEventListener("beforeunload", unload);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("beforeunload", unload);
    };
  });
  function localAnalysis() {
    if (!source) return;
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = Math.max(1, Math.round((256 * source.height) / source.width));
    const ctx = c.getContext("2d")!;
    ctx.drawImage(source, 0, 0, c.width, c.height);
    const m = measure(ctx.getImageData(0, 0, c.width, c.height).data);
    setMeasurements(m);
    setRecommendations(recommend(m, photoType));
    toast("Image statistics measured locally. 15 starting points ready.");
    return m;
  }
  function applyAutoBalance() {
    const m = localAnalysis();
    if (!m) return;
    commit({
      ...edit,
      adjustments: { ...edit.adjustments, ...autoBalance(m) },
      preset: "Auto Balance",
    });
    toast("Measured auto-balance applied. Undo or fine-tune any setting.");
  }
  async function runAI(mode: "analyze" | "prompt") {
    if (!source) return;
    setConsent(null);
    setAiBusy(true);
    const generation = imageGeneration.current;
    try {
      const c = document.createElement("canvas");
      const scale = Math.min(1, 768 / Math.max(source.width, source.height));
      c.width = source.width * scale;
      c.height = source.height * scale;
      c.getContext("2d")!.drawImage(source, 0, 0, c.width, c.height);
      const result = await askAI(
        c.toDataURL("image/jpeg", 0.75),
        mode === "prompt"
          ? `${prompt}\nCurrent adjustments: ${JSON.stringify(edit.adjustments)}`
          : "Analyze lighting, color, composition and appropriate creative goals.",
        mode,
      );
      if (generation !== imageGeneration.current) return;
      if (mode === "analyze") {
        setAiNotes([
          `AI photo type: ${result.photoType ?? "unspecified"}`,
          ...result.observations,
        ]);
        localAnalysis();
        if (result.suggestions.length)
          setRecommendations(
            result.suggestions.map((p) => ({
              ...p,
              category: "AI suggested",
              image: "alpine",
            })),
          );
      } else {
        if (!Object.keys(result.adjustments).length) {
          setProposal(undefined);
          toast(
            result.explanation ||
              "No supported adjustment was proposed. Your photo has not changed.",
            true,
          );
          return;
        }
        setProposal({
          adjustments: result.adjustments,
          explanation: result.explanation,
        });
      }
      toast("AI suggestions ready. Review before applying.");
    } catch (e) {
      toast(
        e instanceof Error
          ? e.message
          : "AI unavailable. Continue with local tools.",
        true,
      );
    } finally {
      setAiBusy(false);
    }
  }
  function promptPreview() {
    if (!prompt.trim()) return;
    if (useGemini) {
      setConsent("prompt");
      return;
    }
    try {
      setProposal(parseLocalPrompt(prompt));
      toast("Suggested adjustments previewed. Apply or cancel below.");
    } catch (e) {
      toast((e as Error).message, true);
    }
  }
  async function favorite(id: string) {
    const f = favorites.includes(id)
      ? favorites.filter((v) => v !== id)
      : [...favorites, id];
    try {
      await setPreference("favorites", f);
      setFavorites(f);
    } catch {
      toast("Could not save favorite.", true);
    }
  }
  const available = styleSearch
    ? [...customPresets, ...presets].filter((p) =>
        `${p.name} ${p.category}`
          .toLowerCase()
          .includes(styleSearch.toLowerCase()),
      )
    : [...customPresets, ...recommendations];

  return {
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
    measurements,
    photoType,
    setPhotoType,
    setRecommendations,
    favorites,
    styleSearch,
    setStyleSearch,
    intensity,
    selectedPreset,
    prompt,
    setPrompt,
    useGemini,
    setUseGemini,
    aiBusy,
    proposal,
    setProposal,
    aiNotes,
    consent,
    setConsent,
    presetName,
    setPresetName,
    customPresets,
    setCustomPresets,
    input,
    commit,
    adjust,
    applyPreset,
    importFiles,
    save,
    localAnalysis,
    applyAutoBalance,
    runAI,
    promptPreview,
    favorite,
    available,
    setIndex,
    setSelectedPreset,
  };
}
export type EditorController = ReturnType<typeof useEditor>;
