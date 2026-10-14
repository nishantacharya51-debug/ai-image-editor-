import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Columns2, Split, ArrowUpRight } from "lucide-react";
import { listProjects } from "../lib/storage";
import { type Project, initialEdit } from "../engine/types";
import { decodeImage } from "../lib/images";
import { renderImage, toBlob } from "../engine/render";
import { Comparison } from "../components/Photo";
import { PageHeading, Empty, Spinner } from "../components/UI";
export default function Compare() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState("");
  const [urls, setUrls] = useState<string[]>([]);
  const [side, setSide] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    listProjects()
      .then((p) => {
        setProjects(p);
        setSelected(p[0]?.id ?? "");
      })
      .catch(() => setError("Could not load local projects."))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    const p = projects.find((p) => p.id === selected);
    if (!p) return;
    let live = true;
    let next: string[] = [];
    setLoading(true);
    setError("");
    (async () => {
      const bitmap = await decodeImage(p.original);
      try {
        const original = {
          ...initialEdit(),
          rotation: p.edit.rotation,
          flipX: p.edit.flipX,
          flipY: p.edit.flipY,
          crop: p.edit.crop,
          cropX: p.edit.cropX,
          cropY: p.edit.cropY,
        };
        const [a, b] = await Promise.all([
          renderImage(bitmap, original, 1600),
          renderImage(bitmap, p.edit, 1600),
        ]);
        next = await Promise.all(
          [a, b].map(async (c) => URL.createObjectURL(await toBlob(c))),
        );
        if (live) setUrls(next);
        else next.forEach(URL.revokeObjectURL);
      } finally {
        bitmap.close();
      }
    })()
      .catch((e) => setError(e.message))
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
      next.forEach(URL.revokeObjectURL);
    };
  }, [projects, selected]);
  return (
    <main className="page-container">
      <PageHeading
        eyebrow="A DIFFERENT PERSPECTIVE"
        title="See how far you’ve come."
        description="The same photo. Your point of view. Compare your original with a saved edit."
      />
      {projects.length > 0 && (
        <div className="compare-controls">
          <label>
            Project
            <select
              aria-label="Compare project"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <div className="segmented-control">
            <button
              className={!side ? "active" : ""}
              onClick={() => setSide(false)}
            >
              <Split size={16} /> Slider
            </button>
            <button
              className={side ? "active" : ""}
              onClick={() => setSide(true)}
            >
              <Columns2 size={16} /> Side by side
            </button>
          </div>
          <Link className="button dark" to={`/editor/${selected}`}>
            Keep creating <ArrowUpRight size={16} />
          </Link>
        </div>
      )}
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
      {loading ? (
        <div className="empty-state">
          <Spinner label="Preparing comparison…" />
        </div>
      ) : !projects.length ? (
        <Empty
          title="A before. An after. A little you."
          description="Save an edited project to compare it here."
        />
      ) : (
        urls.length === 2 &&
        (side ? (
          <div className="side-comparison">
            <div>
              <img src={urls[0]} alt="Original photo" />
              <span>ORIGINAL</span>
            </div>
            <div>
              <img src={urls[1]} alt="Saved edited photo" />
              <span>YOUR EDIT</span>
            </div>
          </div>
        ) : (
          <Comparison
            original={urls[0]}
            edited={urls[1]}
            className="large-comparison"
          />
        ))
      )}
      <p className="muted small-copy">
        Comparison uses the project’s last saved edit. Matching crop and
        orientation are applied to both views.
      </p>
    </main>
  );
}
