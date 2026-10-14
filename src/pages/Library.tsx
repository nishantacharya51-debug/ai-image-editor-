import { assetUrl } from "../lib/paths";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpRight, Search, Heart, SlidersHorizontal } from "lucide-react";
import { categories, presets } from "../data/presets";
import {
  getPreference,
  setPreference,
  getCustomPresets,
  listProjects,
} from "../lib/storage";
import { PageHeading, Modal, useToast } from "../components/UI";
import { PresetCard, EditedPhoto } from "../components/Photo";
import { importRecipe, exportRecipe } from "../lib/backups";
import type { Preset } from "../engine/types";
export default function Library({ saved = false }: { saved?: boolean }) {
  const [params] = useSearchParams();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All styles");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sort, setSort] = useState("curated");
  const [custom, setCustom] = useState<Preset[]>([]);
  const [recent, setRecent] = useState<{ id: string; name: string }>();
  const [selected, setSelected] = useState<Preset | undefined>(
    presets.find((p) => p.id === params.get("style")),
  );
  const toast = useToast();
  const recipeInput = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  useEffect(() => {
    listProjects()
      .then((p) => setRecent(p[0]))
      .catch(() => {});
    getPreference<string[]>("favorites", [])
      .then(setFavorites)
      .catch(() => toast("Could not read saved favorites.", true));
    getCustomPresets()
      .then(setCustom)
      .catch(() => {});
  }, [toast]);
  async function favorite(id: string) {
    const next = favorites.includes(id)
      ? favorites.filter((f) => f !== id)
      : [...favorites, id];
    try {
      await setPreference("favorites", next);
      setFavorites(next);
    } catch {
      toast("Could not save your favorite.", true);
    }
  }
  let filtered = [...custom, ...presets].filter(
    (p) =>
      (category === "All styles" || p.category === category) &&
      (!onlyFavorites || favorites.includes(p.id)) &&
      `${p.name} ${p.description} ${p.category}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  if (sort === "name")
    filtered = filtered.sort((a, b) => a.name.localeCompare(b.name));
  return (
    <main className="page-container">
      <input
        className="sr-only"
        ref={recipeInput}
        type="file"
        accept=".json"
        aria-label="Import editing recipe"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setImporting(true);
          try {
            const p = await importRecipe(file);
            const list = [...(await getCustomPresets()), p];
            await setPreference("customPresets", list);
            setCustom(list);
            setSelected(p);
            toast("Editing recipe imported into your custom library.");
          } catch (error) {
            toast((error as Error).message, true);
          } finally {
            setImporting(false);
          }
        }}
      />
      <PageHeading
        eyebrow={saved ? "YOUR CREATIVE TOOLKIT" : "THE STYLE COLLECTION"}
        title={
          saved
            ? "A good starting point. Saved."
            : "Find a look. Make it yours."
        }
        description={
          saved
            ? "Your custom recipes, favorites, and the complete local preset library."
            : "Thoughtfully crafted color, light, and character. Every style is fully editable."
        }
      >
        <div className="page-heading-actions">
          <button
            className="button outline"
            disabled={importing}
            onClick={() => recipeInput.current?.click()}
          >
            {importing ? "Importing…" : "Import recipe"}
          </button>
          <Link className="button dark" to="/editor">
            Open the editor <ArrowUpRight size={16} />
          </Link>
        </div>
      </PageHeading>
      <div className="library-feature">
        <div>
          <span className="eyebrow">THE FEATURED COLLECTION</span>
          <h2>A cinematic state of mind.</h2>
          <p>Deep greens. Warm highlights. Stories in every shadow.</p>
          <button
            className="button light"
            onClick={() => setCategory("Cinematic")}
          >
            Explore the collection <ArrowUpRight size={16} />
          </button>
        </div>
        <EditedPhoto src={assetUrl("images/alpine.jpg")} preset={presets[0]} />
      </div>
      <div className="library-controls">
        <label className="search-input">
          <Search size={18} />
          <input
            placeholder="Search styles, moods, or categories…"
            aria-label="Search styles"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button
          className={`button outline ${onlyFavorites ? "active" : ""}`}
          onClick={() => setOnlyFavorites(!onlyFavorites)}
        >
          <Heart size={16} /> Favorites{" "}
          {favorites.length > 0 && `(${favorites.length})`}
        </button>
        <label className="sort-control">
          <SlidersHorizontal size={16} />
          <select
            aria-label="Sort presets"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="curated">Curated order</option>
            <option value="name">Name A–Z</option>
          </select>
        </label>
      </div>
      <div className="category-chips wrap">
        {[...categories, ...(custom.length ? ["Custom"] : [])].map((c) => (
          <button
            key={c}
            className={category === c ? "active" : ""}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="results-label">
        {filtered.length} styles <span>LOCAL PREVIEWS · REAL ADJUSTMENTS</span>
      </div>
      <div className="preset-grid">
        {filtered.map((p) => (
          <PresetCard
            key={p.id}
            preset={p}
            favorite={favorites.includes(p.id)}
            onFavorite={() => favorite(p.id)}
            onSelect={() => setSelected(p)}
          />
        ))}
      </div>
      {!filtered.length && (
        <div className="empty-state">
          <Search size={30} />
          <h2>No styles found</h2>
          <p>Try a different search or favorite a style to keep it here.</p>
          <button
            className="button outline"
            onClick={() => {
              setSearch("");
              setCategory("All styles");
              setOnlyFavorites(false);
            }}
          >
            Clear filters
          </button>
        </div>
      )}
      {selected && (
        <Modal key={selected.id} title={selected.name} onClose={() => setSelected(undefined)}>
          <EditedPhoto
            className="modal-photo"
            src={assetUrl(`images/${selected.image}.jpg`)}
            preset={selected}
          />
          <p>{selected.description}</p>
          <div className="recipe-list">
            {Object.entries(selected.adjustments).map(([k, v]) => (
              <span key={k}>
                {k}
                <b>
                  {v > 0 ? "+" : ""}
                  {v}
                </b>
              </span>
            ))}
          </div>
          <button
            className="button outline full"
            onClick={() => {
              exportRecipe(selected);
              toast("Portable recipe downloaded.");
            }}
          >
            Download editing recipe
          </button>
          <p className="muted small-copy">
            This is a non-destructive color recipe, not generative editing. Your
            subject stays yours.
          </p>
          {recent && (
            <Link
              className="button dark full"
              to={`/editor/${recent.id}?preset=${selected.id}`}
            >
              Apply to latest project <ArrowUpRight size={16} />
            </Link>
          )}
          {recent && (
            <p className="muted small-copy">
              Latest project: {recent.name}. You can undo this recipe in the
              editor.
            </p>
          )}
          <Link
            className={`button ${recent ? "outline" : "dark"} full`}
            to={`/editor?preset=${selected.id}`}
          >
            Use a new photo <ArrowUpRight size={16} />
          </Link>
        </Modal>
      )}
    </main>
  );
}
