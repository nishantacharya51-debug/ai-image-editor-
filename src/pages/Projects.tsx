import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  Heart,
  Copy,
  Trash2,
  Pencil,
  ArrowUpRight,
  Clock,
  FolderOpen,
  Download,
  Upload,
  LoaderCircle,
} from "lucide-react";
import { listProjects, putProject, deleteProject } from "../lib/storage";
import { exportProjectBackup, restoreProjectBackup } from "../lib/backups";
import type { Project } from "../engine/types";
import { Empty, Modal, PageHeading, Spinner, useToast } from "../components/UI";
function Thumbnail({ blob, name }: { blob: Blob; name: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return <img src={url || undefined} alt={name} />;
}
export default function Projects({ history = false }: { history?: boolean }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState(false);
  const [sort, setSort] = useState("updated");
  const [rename, setRename] = useState<Project>();
  const [remove, setRemove] = useState<Project>();
  const toast = useToast();
  const backupInput = useRef<HTMLInputElement>(null);
  const [transferring, setTransferring] = useState<string | null>(null);
  async function load() {
    setLoading(true);
    setError("");
    try {
      setProjects(await listProjects());
    } catch {
      setError(
        "Could not open local project storage. Check your browser storage permissions.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function update(p: Project) {
    try {
      await putProject(p);
      await load();
      return true;
    } catch {
      toast("Could not update the project.", true);
      return false;
    }
  }
  async function duplicate(p: Project) {
    const copy = {
      ...p,
      id: crypto.randomUUID(),
      name: `${p.name} — copy`,
      created: Date.now(),
      updated: Date.now(),
    };
    if (await update(copy)) toast("Project duplicated.");
  }
  const filtered = projects
    .filter(
      (p) =>
        (!favorites || p.favorite) &&
        p.name.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "name" ? a.name.localeCompare(b.name) : b.updated - a.updated,
    );
  return (
    <main className="page-container">
      <input
        className="sr-only"
        ref={backupInput}
        type="file"
        accept=".acharya,.zip"
        aria-label="Restore project backup"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setTransferring("restore");
          try {
            const p = await restoreProjectBackup(file);
            await putProject(p);
            await load();
            toast(
              "Project restored with its original image and editable history.",
            );
          } catch (error) {
            toast((error as Error).message, true);
          } finally {
            setTransferring(null);
          }
        }}
      />
      <PageHeading
        eyebrow={
          history ? "PICK UP WHERE YOU LEFT OFF" : "YOUR PERSONAL STUDIO"
        }
        title={history ? "A history of good ideas." : "Your vision lives here."}
        description={
          history
            ? "Recent projects and their saved editing steps, all in this browser."
            : "Originals, experiments, and the photos that feel like you. Saved on this device."
        }
      >
        <div className="page-heading-actions">
          <button
            className="button outline"
            disabled={!!transferring}
            onClick={() => backupInput.current?.click()}
          >
            {transferring === "restore" ? (
              <Spinner label="Restoring…" />
            ) : (
              <>
                <Upload size={16} /> Restore backup
              </>
            )}
          </button>
          <Link to="/editor" className="button dark">
            <Plus size={17} /> New project
          </Link>
        </div>
      </PageHeading>
      <div className="workspace-stats">
        <div>
          <FolderOpen size={21} />
          <span>
            <strong>{projects.length}</strong> saved projects
          </span>
        </div>
        <div>
          <Heart size={21} />
          <span>
            <strong>{projects.filter((p) => p.favorite).length}</strong>{" "}
            favorites
          </span>
        </div>
        <div>
          <Clock size={21} />
          <span>
            {projects.length
              ? "Your next great edit is a click away."
              : "A fresh workspace. Make it yours."}
          </span>
        </div>
      </div>
      <div className="library-controls">
        <label className="search-input">
          <Search size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a project…"
            aria-label="Search projects"
          />
        </label>
        <button
          className={`button outline ${favorites ? "active" : ""}`}
          onClick={() => setFavorites(!favorites)}
        >
          <Heart size={16} /> Favorites
        </button>
        <select
          aria-label="Sort projects"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="updated">Recently edited</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>
      {loading ? (
        <div className="empty-state">
          <Spinner label="Opening your workspace…" />
        </div>
      ) : error ? (
        <div className="empty-state" role="alert">
          <p>{error}</p>
          <button className="button dark" onClick={load}>
            Retry
          </button>
        </div>
      ) : !filtered.length ? (
        <Empty
          title={
            projects.length
              ? "No projects match."
              : "Every great edit starts somewhere."
          }
          description={
            projects.length
              ? "Try another search or turn off favorites."
              : "Upload your first photo. We’ll keep the original safe while you explore."
          }
        />
      ) : (
        <div className={history ? "project-history-list" : "project-grid"}>
          {filtered.map((p) => (
            <article className="project-card" key={p.id}>
              <Link to={`/editor/${p.id}`} className="project-thumbnail">
                <Thumbnail blob={p.thumbnail} name={p.name} />
                <span>
                  Continue editing <ArrowUpRight size={16} />
                </span>
              </Link>
              <div className="project-info">
                <Link to={`/editor/${p.id}`}>
                  <h3>{p.name}</h3>
                </Link>
                <p>
                  {p.width} × {p.height} <span>·</span>{" "}
                  {new Date(p.updated).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                {history && (
                  <p>
                    {p.history.length} saved steps · {p.edit.preset}
                    <br />
                    Open the History tool in the editor to restore a step.
                  </p>
                )}
                <div className="project-actions">
                  <button
                    className="icon-button"
                    aria-label={`Favorite ${p.name}`}
                    onClick={() => update({ ...p, favorite: !p.favorite })}
                  >
                    <Heart
                      size={16}
                      fill={p.favorite ? "currentColor" : "none"}
                    />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Rename ${p.name}`}
                    onClick={() => setRename(p)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Duplicate ${p.name}`}
                    onClick={() => duplicate(p)}
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    className="icon-button danger"
                    aria-label={`Delete ${p.name}`}
                    onClick={() => setRemove(p)}
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Back up ${p.name}`}
                    disabled={!!transferring}
                    onClick={async () => {
                      setTransferring(p.id);
                      try {
                        await exportProjectBackup(p);
                        toast(
                          "Portable project backup downloaded. Keep it somewhere safe.",
                        );
                      } catch {
                        toast("Backup failed. Please try again.", true);
                      } finally {
                        setTransferring(null);
                      }
                    }}
                  >
                    {transferring === p.id ? (
                      <LoaderCircle size={16} className="spin" />
                    ) : (
                      <Download size={16} />
                    )}
                  </button>
                  <Link to={`/editor/${p.id}`} className="text-link">
                    Open <ArrowUpRight size={14} />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="storage-note">
        <span className="status-dot" /> Projects are stored in this browser, not
        in the cloud. Export important work before clearing browser data.
      </div>
      {rename && (
        <Modal title="Rename project" onClose={() => setRename(undefined)}>
          <label className="form-row">
            Project name
            <input
              value={rename.name}
              onChange={(e) => setRename({ ...rename, name: e.target.value })}
              maxLength={100}
            />
          </label>
          <button
            className="button dark full"
            disabled={!rename.name.trim()}
            onClick={async () => {
              await update({ ...rename, name: rename.name.trim() });
              setRename(undefined);
            }}
          >
            Save name
          </button>
        </Modal>
      )}
      {remove && (
        <Modal
          title="Delete this project?"
          onClose={() => setRemove(undefined)}
        >
          <p>
            “{remove.name}” and its original photo will be removed from this
            browser. This cannot be undone. Downloaded exports are not affected.
          </p>
          <button
            className="button destructive full"
            onClick={async () => {
              try {
                await deleteProject(remove.id);
                setRemove(undefined);
                await load();
                toast("Project deleted from this browser.");
              } catch {
                toast("Could not delete project.", true);
              }
            }}
          >
            Delete project
          </button>
          <button
            className="button outline full"
            onClick={() => setRemove(undefined)}
          >
            Keep project
          </button>
        </Modal>
      )}
    </main>
  );
}
