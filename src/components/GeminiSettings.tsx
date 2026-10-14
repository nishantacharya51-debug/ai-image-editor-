import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  KeyRound,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Eye,
  EyeOff,
  Trash2,
  ArrowUpRight,
} from "lucide-react";
import { z } from "zod";
import { Modal, Spinner, useToast } from "./UI";
const healthSchema = z.object({
  configured: z.boolean(),
  model: z.string(),
  keySource: z.enum(["none", "session", "environment"]),
  setupEnabled: z.boolean(),
  environmentKeyPresent: z.boolean(),
});
type ServerStatus = z.infer<typeof healthSchema>;
export function GeminiSettings() {
  const [status, setStatus] = useState<ServerStatus>();
  const [checking, setChecking] = useState(true);
  const [connectionError, setConnectionError] = useState("");
  const [action, setAction] = useState<"add" | "remove" | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [model, setModel] = useState("gemini-2.5-flash");
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();
  const check = useCallback(async () => {
    setChecking(true);
    setConnectionError("");
    try {
      const response = await fetch("/api/health", {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error();
      const next = healthSchema.parse(await response.json());
      setStatus(next);
      setModel(next.model);
    } catch {
      setStatus(undefined);
      setConnectionError(
        "AI server not reachable. Start npm run server to enable secure key setup. Local editing still works.",
      );
    } finally {
      setChecking(false);
    }
  }, []);
  useEffect(() => {
    void check();
  }, [check]);
  function open(next: "add" | "remove") {
    setApiKey("");
    setSetupCode("");
    setError("");
    setShowKey(false);
    setAction(next);
  }
  function close() {
    if (busy) return;
    setApiKey("");
    setSetupCode("");
    setShowKey(false);
    setError("");
    setAction(null);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!status?.setupEnabled) {
      setError(
        "Secure setup is not available. Start the server or enable the server setup token, then check the connection again.",
      );
      return;
    }
    if (!window.isSecureContext) {
      setError(
        "Use HTTPS or localhost before sending credentials. Nothing was sent.",
      );
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/gemini/config", {
        method: action === "remove" ? "DELETE" : "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-pixora-setup-token": setupCode.trim(),
        },
        ...(action === "add"
          ? {
              body: JSON.stringify({
                apiKey: apiKey.trim(),
                model: model.trim(),
              }),
            }
          : {}),
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      const data = await response.json().catch(() => {
        throw new Error(
          "The setup server did not respond correctly. Check that npm run server is running.",
        );
      });
      if (!response.ok)
        throw new Error(data.error || "Could not update Gemini configuration.");
      setStatus(healthSchema.parse(data));
      setAction(null);
      setSetupCode("");
      setShowKey(false);
      toast(
        action === "remove"
          ? data.message
          : "Gemini key saved on the server for this session.",
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not reach the setup server. Please retry.",
      );
    } finally {
      setApiKey("");
      setBusy(false);
    }
  }
  return (
    <section className="settings-section" id="gemini">
      <h2>
        <Sparkles size={20} /> Optional Gemini connection
      </h2>
      <p>
        Add your own Gemini API key to enable visual analysis and broader
        prompt-based adjustments. Local editing remains free and works without
        it.
      </p>
      <div
        className={`gemini-connection-card ${status?.configured ? "connected" : ""}`}
      >
        <span className="gemini-key-icon">
          <KeyRound size={21} />
        </span>
        <div>
          <strong>
            {checking
              ? "Checking your connection…"
              : status?.configured
                ? "Gemini key configured"
                : "Connect your creative assistant"}
          </strong>
          <p>
            {checking
              ? "Checking server settings, not making an AI request."
              : connectionError ||
                (status?.configured
                  ? `${status.model} · ${status.keySource === "session" ? "Saved for this server session" : "Managed by server environment"}`
                  : "No API key connected. Your photos still stay local by default.")}
          </p>
        </div>
        {status?.configured && (
          <span className="connection-badge">CONFIGURED</span>
        )}
      </div>
      <div className="gemini-actions">
        <button
          className="button dark"
          onClick={() => open("add")}
          disabled={checking}
        >
          <KeyRound size={16} />
          {status?.configured ? "Update Gemini API key" : "Add Gemini API key"}
        </button>
        <button className="button outline" disabled={checking} onClick={check}>
          {checking ? (
            <Spinner label="Checking…" />
          ) : (
            <>
              <RefreshCw size={15} /> Check server configuration
            </>
          )}
        </button>
        {status?.keySource === "session" && (
          <button
            className="button outline danger"
            onClick={() => open("remove")}
          >
            <Trash2 size={15} /> Clear session key
          </button>
        )}
      </div>
      <p className="small-copy muted">
        <ShieldCheck size={14} className="inline-icon" /> The key is sent only
        to your server, kept in server memory, and never saved in browser
        storage. It is used with Google only when you explicitly request AI.
      </p>
      {status && !status.setupEnabled && (
        <div className="notice">
          Browser setup is disabled on this server. Ask the server owner to set{" "}
          server setup token (at least 24 characters), or use a server-side{" "}
          <code>GEMINI_API_KEY</code>.
        </div>
      )}
      <p className="small-copy muted">
        Saving a key does not verify it with Google or enable billing. Free-tier
        availability, model support, and quotas depend on your account. Never
        share the server setup code.
      </p>
      {action && (
        <Modal
          title={
            action === "add"
              ? "Connect Gemini securely"
              : "Clear the session key?"
          }
          onClose={close}
        >
          <form onSubmit={submit} autoComplete="off">
            <p className="small-copy muted">
              {action === "add"
                ? "Bring your own key. It stays on the server until the server restarts; it is not written into your project or browser storage."
                : "This clears the key entered through this screen for everyone using this server. Any key configured in the server environment becomes active again."}
            </p>
            {action === "add" && (
              <>
                <label className="form-row">
                  Gemini API key
                  <div className="secret-input">
                    <input
                      aria-label="Gemini API key"
                      type={showKey ? "text" : "password"}
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Paste your Gemini API key"
                      minLength={20}
                      maxLength={256}
                      required
                      disabled={busy}
                    />
                    <button
                      type="button"
                      aria-label={showKey ? "Hide API key" : "Show API key"}
                      aria-pressed={showKey}
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </label>
                <a
                  className="text-link"
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get a key in Google AI Studio <ArrowUpRight size={14} />
                </a>
                <label className="form-row">
                  Gemini model
                  <input
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    pattern="gemini-[a-zA-Z0-9._\-]+"
                    maxLength={107}
                    required
                    disabled={busy}
                    spellCheck={false}
                  />
                </label>
              </>
            )}
            <label className="form-row">
              Server setup code
              <input
                type="password"
                value={setupCode}
                onChange={(e) => setSetupCode(e.target.value)}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Code from the server terminal"
                minLength={24}
                maxLength={256}
                required
                disabled={busy}
              />
            </label>
            <div className="notice">
              <strong>Where is the setup code?</strong>
              <br />
              Open the terminal running <code>npm run server</code>. In
              development it prints “Gemini setup code” on startup. On a hosted
              production server, use the owner's server setup token . The code
              prevents other visitors from changing your key.
            </div>
            <p className="small-copy muted">
              This config is shared by everyone using this server. Only connect
              a key to a server you trust. Use server environment secrets for a
              persistent deployment.
            </p>
            {error && (
              <p className="setup-error" role="alert">
                {error}{" "}
                {action === "add"
                  ? "For safety, re-enter the API key before retrying."
                  : ""}
              </p>
            )}
            <button
              className={`button ${action === "remove" ? "destructive" : "dark"} full`}
              type="submit"
              disabled={busy || !status?.setupEnabled}
            >
              {busy ? (
                <Spinner label="Updating securely…" />
              ) : action === "add" ? (
                <>
                  <KeyRound size={16} /> Save key to server
                </>
              ) : (
                "Clear session key"
              )}
            </button>
            <button
              className="button outline full"
              type="button"
              disabled={busy}
              onClick={close}
            >
              Cancel
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
}
