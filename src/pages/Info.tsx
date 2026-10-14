import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BRAND } from "../lib/config";
import {
  ArrowUpRight,
  Check,
  ShieldCheck,
  HardDrive,
  Keyboard,
  Trash2,
} from "lucide-react";
import { PageHeading, Modal, useToast } from "../components/UI";
import { GeminiSettings } from "../components/GeminiSettings";
import { PersonalGeminiSettings } from "../auth/PersonalGeminiSettings";
import { cloudConfigured } from "../auth/client";
import { isGitHubPages } from "../lib/paths";
import {
  clearProjects,
  clearPreferences,
  getPreference,
  setPreference,
} from "../lib/storage";
export function Pricing() {
  return (
    <main className="page-container narrow">
      <PageHeading
        eyebrow="CREATIVITY SHOULDN’T HAVE A PAYWALL"
        title="Free, by design."
        description="A capable local studio. No subscription, no account, no fine-print upgrade."
      />
      <div className="pricing-card">
        <span className="eyebrow">YOUR EVERYDAY CREATIVE STUDIO</span>
        <h2>
          $0<span> / always for local editing</span>
        </h2>
        <p>Everything you need to turn a photo into your photo.</p>
        <div className="pricing-features">
          {[
            "All local adjustment tools",
            "20 editable creative styles",
            "Unlimited local edits and exports",
            "Original-resolution PNG and JPEG export",
            "Local projects, custom presets and favorites",
            "Measured photo insights and offline prompt rules",
            "Before/after comparison and undo/redo",
            "Manual masked smoothing and background blur",
          ].map((f) => (
            <span key={f}>
              <Check size={17} />
              {f}
            </span>
          ))}
        </div>
        <Link to="/editor" className="button dark full">
          Open your studio <ArrowUpRight size={17} />
        </Link>
      </div>
      <section className="prose">
        <h2>What about Gemini?</h2>
        <p>
          Optional AI features require a server configured with a Gemini API
          key. Your Google account’s model availability, regional restrictions,
          quotas, and data terms apply. A free tier is not unlimited, and
          availability can change. This application does not automatically
          enable billing, purchase credits, or retry requests indefinitely.
        </p>
        <h2>The honest limits</h2>
        <p>
          Local processing is limited by your device and browser storage.
          Uploads are limited to 30 MB and 40 megapixels. Projects don’t sync
          across devices. Generative object editing and automatic background
          segmentation aren’t included. No paid service is required for the
          complete local editing workflow.
        </p>
        <Link className="text-link" to="/help">
          Learn what each tool does <ArrowUpRight size={16} />
        </Link>
      </section>
    </main>
  );
}
export function Settings() {
  const [format, setFormat] = useState("image/jpeg");
  const [reduced, setReduced] = useState(false);
  const [clear, setClear] = useState<"projects" | "preferences" | null>(null);
  const toast = useToast();
  useEffect(() => {
    getPreference("exportFormat", "image/jpeg")
      .then(setFormat)
      .catch(() => {});
    getPreference("reducedMotion", false)
      .then(setReduced)
      .catch(() => {});
  }, []);
  async function preference(key: string, value: unknown) {
    try {
      await setPreference(key, value);
      toast("Preference saved.");
    } catch {
      toast("Could not save preference.", true);
    }
  }
  return (
    <main className="page-container narrow">
      <PageHeading
        eyebrow="MAKE YOURSELF AT HOME"
        title="A studio that fits you."
        description="Local preferences for your creative workspace. Manage your account and saved AI key separately."
      />
      <div className="settings-section">
        <h2>
          <HardDrive size={20} /> Export preferences
        </h2>
        <label className="settings-row">
          <span>
            <strong>Default export format</strong>
            <small>Applied the next time you open export.</small>
          </span>
          <select
            value={format}
            onChange={(e) => {
              setFormat(e.target.value);
              void preference("exportFormat", e.target.value);
            }}
          >
            <option value="image/jpeg">JPEG</option>
            <option value="image/png">PNG</option>
          </select>
        </label>
        <label className="settings-row">
          <span>
            <strong>Reduce interface motion</strong>
            <small>Your system preference is also respected.</small>
          </span>
          <input
            type="checkbox"
            checked={reduced}
            onChange={(e) => {
              setReduced(e.target.checked);
              document.documentElement.dataset.reduceMotion = String(
                e.target.checked,
              );
              void preference("reducedMotion", e.target.checked);
            }}
          />
        </label>
      </div>
      {cloudConfigured || isGitHubPages ? (
        <PersonalGeminiSettings />
      ) : (
        <>
          <PersonalGeminiSettings />
          <details className="local-admin-settings">
            <summary>Local developer server configuration</summary>
            <GeminiSettings />
          </details>
        </>
      )}
      <div className="settings-section">
        <h2>
          <ShieldCheck size={20} /> Your local data
        </h2>
        <p>
          Projects contain original image blobs, thumbnails, and editable
          parameters in IndexedDB. No automatic external photo upload,
          analytics, cloud sync, or account tracking is implemented.
        </p>
        <div className="settings-row">
          <span>
            <strong>Clear all projects</strong>
            <small>
              Permanently removes originals and saved edits from this browser.
            </small>
          </span>
          <button
            className="button outline danger"
            onClick={() => setClear("projects")}
          >
            <Trash2 size={15} /> Clear projects
          </button>
        </div>
        <div className="settings-row">
          <span>
            <strong>Reset preferences</strong>
            <small>Removes favorites, custom presets, and preferences.</small>
          </span>
          <button
            className="button outline"
            onClick={() => setClear("preferences")}
          >
            Reset
          </button>
        </div>
      </div>
      {clear && (
        <Modal title={`Clear ${clear}?`} onClose={() => setClear(null)}>
          <p>
            This cannot be undone. Export any important photos first. Downloaded
            files are not affected.
          </p>
          <button
            className="button destructive full"
            onClick={async () => {
              try {
                if (clear === "projects") await clearProjects();
                else {
                  await clearPreferences();
                  setFormat("image/jpeg");
                  setReduced(false);
                  document.documentElement.dataset.reduceMotion = "false";
                }
                setClear(null);
                toast("Local data cleared.");
              } catch {
                toast(
                  "Unable to clear storage. Use your browser’s site-data settings.",
                  true,
                );
              }
            }}
          >
            Yes, clear {clear}
          </button>
          <button
            className="button outline full"
            onClick={() => setClear(null)}
          >
            Cancel
          </button>
        </Modal>
      )}
    </main>
  );
}
export function Help() {
  return (
    <main className="page-container narrow">
      <PageHeading
        eyebrow="A LITTLE GUIDANCE GOES A LONG WAY"
        title="Make yourself a natural."
        description="A practical guide to your creative workspace, without the technical guesswork."
      />
      <div className="help-links">
        <a href="#start">Getting started</a>
        <a href="#tools">Editing tools</a>
        <a href="#ai">AI & prompts</a>
        <a href="#shortcuts">Shortcuts</a>
        <a href="#trouble">Troubleshooting</a>
      </div>
      <article className="prose">
        <h2 id="start">From upload to your first export</h2>
        <ol>
          <li>
            Open the editor, drag in a JPEG, PNG, or WebP, or try the example.
            The original is stored locally as a new project. Multiple uploads
            create up to eight projects.
          </li>
          <li>
            Use AI Analysis → Analyze locally to measure brightness, color, and
            clipping. Select the photo type yourself for more relevant
            suggestions.
          </li>
          <li>
            Choose a style or fine-tune individual sliders. Style recipes
            replace adjustments but keep composition and text.
          </li>
          <li>
            Use Compare or the B key to check the original. Undo restores actual
            settings, not a flattened preview.
          </li>
          <li>
            Click Save to preserve your latest changes. Export a PNG or JPEG to
            keep an independent copy.
          </li>
        </ol>
        <h2 id="tools">What the tools really do</h2>
        <p>
          <strong>Light and color:</strong> exposure is measured in stops. Tonal
          controls weight adjustments by luminance. Temperature, tint, RGB
          balance, split toning, saturation, vibrance, gamma, and hue operate on
          actual pixels. Hue is an approximate luminance-preserving rotation,
          not a calibrated color-science transform.
        </p>
        <p>
          <strong>Details:</strong> sharpness and clarity use unsharp masking at
          different scales. Grain is deterministic procedural noise. Fade lifts
          the black floor, and vignette darkens edges. These are practical
          creative tools, not RAW development or calibrated ICC workflows.
        </p>
        <p>
          <strong>Portrait and background:</strong> position a feathered
          elliptical mask with X, Y, and radius. Smoothing works inside the
          ellipse; background blur works outside it. Neither detects faces,
          objects, hair, or boundaries.
        </p>
        <p>
          <strong>Composition:</strong> aspect-ratio crops can be repositioned
          horizontally and vertically. Rotate in 90-degree steps, flip either
          axis, or add a simple text overlay. Freehand crop, arbitrary
          straightening, layers, and curves are not implemented.
        </p>
        <h2 id="ai">A useful creative assistant, honestly labeled</h2>
        <p>
          The offline prompt interpreter recognizes a small vocabulary of color
          and lighting instructions: “warmer,” “soft shadows,” “cinematic,”
          “vibrant,” “studio,” “film,” and “black and white.” It is rule-based,
          not a language model. Its suggestions are shown as a preview until you
          apply them.
        </p>
        <p>
          For broader language understanding and visual analysis, a developer
          can configure Gemini on the server. Every AI photo request needs an
          explicit send action. Responses are schema-validated and settings are
          clamped. Visual observations can be subjective or wrong. Gemini quota
          or network failures don’t stop local editing.
        </p>
        <p>
          Adding or removing subjects, arbitrary background replacement,
          face-aware relighting, and true generative transformations are not
          available. Color grading cannot pretend to do these things.
        </p>
        <h2 id="shortcuts">
          <Keyboard size={24} /> Your keyboard, a little more useful
        </h2>
        <div className="shortcut-list">
          <span>
            Undo<kbd>Ctrl / ⌘ Z</kbd>
          </span>
          <span>
            Redo<kbd>Ctrl / ⌘ Shift Z</kbd>
          </span>
          <span>
            Save project<kbd>Ctrl / ⌘ S</kbd>
          </span>
          <span>
            Toggle original<kbd>B</kbd>
          </span>
          <span>
            Exit comparison / cancel prompt preview<kbd>Esc</kbd>
          </span>
          <span>
            Paste a photo from clipboard<kbd>Ctrl / ⌘ V</kbd>
          </span>
        </div>
        <h2 id="trouble">When something isn’t quite right</h2>
        <p>
          <strong>Upload fails:</strong> check the actual image format and try a
          file under 30 MB / 40 MP. A renamed extension does not turn a file
          into an image. Corrupt files are rejected.
        </p>
        <p>
          <strong>Preview or export fails:</strong> very large images can exceed
          device memory. Try a smaller source or a 2048 px export. Heavy
          processing runs in a worker, but image decoding and compositing still
          use browser memory.
        </p>
        <p>
          <strong>Projects disappear:</strong> storage is specific to this
          browser, device, and site address. Private browsing, clearing site
          data, browser eviction, or changing domains can remove or hide
          projects. There is no automatic cloud photo backup. Download a project
          backup from Projects to keep your source and editing history.
        </p>
        <p>
          <strong>Gemini unavailable:</strong> check Settings and your server
          environment. A missing API key, unsupported model, regional
          restrictions, rate limit, or disconnected network can prevent
          requests. Nothing is retried indefinitely.
        </p>
        <Link className="button dark" to="/editor">
          Ready to create <ArrowUpRight size={16} />
        </Link>
      </article>
    </main>
  );
}
export function Legal({ terms = false }: { terms?: boolean }) {
  return (
    <main className="page-container narrow">
      <PageHeading
        eyebrow="THE CLEAR, PLAIN-LANGUAGE VERSION"
        title={terms ? "Terms of use." : "Your photos. Your privacy."}
        description="Last updated October 14, 2026 · Local-first edition"
      />
      <article className="prose">
        {terms ? (
          <>
            <h2>Your creative work</h2>
            <p>
              You retain rights in the photos you upload and the edits you
              create. Only use images you own or have permission to edit. You
              are responsible for respecting copyright, privacy, publicity
              rights, and applicable law.
            </p>
            <h2>The service as provided</h2>
            <p>
              {BRAND.full} is a local-first photo editor provided as-is, without
              guarantees of uninterrupted availability, perfect accuracy,
              fitness for a specific purpose, or preservation of browser data.
              Keep independent copies of important images. Applicable statutory
              rights are not waived.
            </p>
            <h2>AI and external services</h2>
            <p>
              Optional Gemini features depend on a configured third-party API.
              Google’s terms, quotas, and data policies apply to that service.
              AI observations and proposed adjustments may be inaccurate. Review
              results before applying or publishing them. No paid service or
              cloud sync is included or promised.
            </p>
            <h2>Responsible use</h2>
            <p>
              Do not use the application to violate another person’s rights,
              distribute illegal material, misrepresent deceptive edits as
              authentic evidence, or abuse a deployed API endpoint. Deployers
              are responsible for appropriate access controls and compliance.
            </p>
            <h2>Updates and support</h2>
            <p>
              This local-first edition may change as it develops. The help
              center documents supported features and current limitations.
              Example photographs are AI-generated creative demonstration
              assets, not customer work or testimonials.
            </p>
          </>
        ) : (
          <>
            <h2>What stays in your browser</h2>
            <p>
              Your uploaded originals, thumbnails, project names, editing
              history, adjustment values, favorites, custom presets, and
              preferences are stored in your browser’s IndexedDB. Normal editing
              and export happen locally. Large image data is not stored in
              localStorage. We do not implement analytics, account tracking, or
              cloud synchronization.
            </p>
            <h2>Online accounts and personal Gemini keys</h2>
            <p>
              Optional sign-up and login use Supabase Auth. Supabase processes
              your email, password authentication, and optional display name.
              The SDK stores login session tokens in this browser to keep you
              signed in. Your Gemini API key is not your password. When you
              explicitly save a key, the backend encrypts it with AES-GCM and
              stores it in your user-specific database record. It is never
              returned to the browser. The server operator controls the
              encryption secret; this is not end-to-end or zero-knowledge
              encryption. Delete the saved key from Account when you no longer
              want it stored. Account authentication does not sync photos.
            </p>
            <h2>When a photo leaves your device</h2>
            <p>
              Only when you explicitly confirm a Gemini request does the
              application send a reduced-size JPEG preview, your prompt, and
              relevant settings to the configured server. The server sends this
              content to Google Gemini. API provider data retention and usage
              terms apply; do not assume free-tier requests are confidential or
              excluded from training. Avoid sending sensitive photos.
            </p>
            <h2>Server and hosting data</h2>
            <p>
              A hosting provider or server operator may log network metadata,
              including IP addresses, timestamps, and request paths. The
              included AI server does not deliberately persist image request
              bodies. In-memory rate limits use IP addresses temporarily. This
              is not a promise of zero provider logging or guaranteed remote
              deletion.
            </p>
            <h2>Control and deletion</h2>
            <p>
              Delete individual projects from My workspace, or use Settings to
              clear all local projects and preferences. Browser site-data
              controls can also remove storage. Deletion removes app-accessible
              records from this browser; it does not erase exported downloads,
              backups, previously sent API content, or copies on other devices.
            </p>
            <h2>Storage and security limits</h2>
            <p>
              Local-first does not mean encrypted-at-rest or end-to-end
              encrypted. Anyone with access to this browser profile may be able
              to access projects. Private browsing, browser storage eviction,
              changing site addresses, and clearing data can remove projects.
              Export important work.
            </p>
            <h2>No automatic upload</h2>
            <p>
              The app does not silently upload your photos. Local example images
              are bundled with the app. You may use every local editing feature
              without enabling Gemini. API secrets are handled only by the
              server, never embedded in the frontend.
            </p>
          </>
        )}
        <Link to="/settings" className="button outline">
          Manage your preferences <ArrowUpRight size={16} />
        </Link>
      </article>
    </main>
  );
}
export function NotFound() {
  return (
    <main className="page-container">
      <div className="not-found">
        <span className="eyebrow">404 · OUTSIDE THE FRAME</span>
        <h1>
          A different kind of
          <br />
          negative space.
        </h1>
        <p>That page isn’t here. Your next great edit still could be.</p>
        <Link to="/" className="button dark">
          Back to the studio <ArrowUpRight size={16} />
        </Link>
      </div>
    </main>
  );
}
