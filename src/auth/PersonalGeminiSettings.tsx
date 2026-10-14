import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { z } from "zod";
import { useAuth } from "./AuthProvider";
import { cloudConfigured, cloudRequest } from "./client";
import { Spinner, useToast, Modal } from "../components/UI";
const statusSchema = z.object({
  configured: z.boolean(),
  model: z.string(),
  updatedAt: z.string().nullable(),
});
type KeyStatus = z.infer<typeof statusSchema>;
export function PersonalGeminiSettings() {
  const { user } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState<KeyStatus>();
  const [key, setKey] = useState("");
  const [model, setModel] = useState("gemini-2.5-flash");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const data = statusSchema.parse(await cloudRequest("key-status"));
      setStatus(data);
      setModel(data.model);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    setKey("");
    setStatus(undefined);
    setVisible(false);
    if (user && cloudConfigured) void refresh();
  }, [user?.id]);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = statusSchema.parse(
        await cloudRequest("save-key", {
          apiKey: key.trim(),
          model: model.trim(),
        }),
      );
      setStatus(data);
      toast("Your Gemini key is saved to your account for future logins.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setKey("");
      setVisible(false);
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    setError("");
    try {
      await cloudRequest("delete-key");
      setStatus({
        configured: false,
        model: "gemini-2.5-flash",
        updatedAt: null,
      });
      setConfirm(false);
      toast("Your saved Gemini key has been deleted.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="personal-key settings-section" id="gemini">
      <h2>
        <KeyRound size={20} /> Your personal Gemini key
      </h2>
      <p>
        Your password logs you in. Your Gemini API key powers AI edits. They are
        different credentials. Your key is encrypted on the server and belongs
        only to your account.
      </p>
      {!cloudConfigured ? (
        <div className="notice">
          Online accounts need the free Supabase backend connected first.{" "}
          <Link className="text-link" to="/setup">
            View setup instructions →
          </Link>
        </div>
      ) : !user ? (
        <>
          <div className="notice">
            Log in or create an account to save a key across sessions. Local
            photo editing needs neither.
          </div>
          <Link className="button dark" to="/login">
            Log in to connect Gemini
          </Link>{" "}
          <Link className="button outline" to="/signup">
            Create account
          </Link>
        </>
      ) : (
        <>
          <div className="gemini-connection-card">
            <KeyRound size={23} />
            <div>
              <strong>
                {loading
                  ? "Checking your account…"
                  : status?.configured
                    ? "Your Gemini key is saved"
                    : "No personal key connected"}
              </strong>
              <p>
                {status?.configured
                  ? `${status.model} · Available after every login`
                  : "Use your own key with a free quota if available. No automatic billing."}
              </p>
            </div>
            <button
              className="icon-button"
              disabled={loading || busy}
              onClick={refresh}
              aria-label="Refresh personal key status"
            >
              <RefreshCw size={16} />
            </button>
          </div>
          <form onSubmit={save} autoComplete="off">
            <label className="form-row">
              Gemini API key
              <div className="secret-input">
                <input
                  type={visible ? "text" : "password"}
                  aria-label="Personal Gemini API key"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder={
                    status?.configured
                      ? "Paste a new key to replace your saved one"
                      : "Paste your Gemini API key"
                  }
                  minLength={20}
                  maxLength={256}
                  autoComplete="off"
                  spellCheck={false}
                  autoCapitalize="none"
                  required
                  disabled={busy}
                />
                <button
                  type="button"
                  aria-label={
                    visible ? "Hide personal API key" : "Show personal API key"
                  }
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>
            <label className="form-row">
              Gemini model
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                maxLength={100}
                required
                disabled={busy}
              />
            </label>
            <div className="gemini-actions">
              <button className="button dark" disabled={busy || !key.trim()}>
                {busy ? (
                  <Spinner label="Updating…" />
                ) : (
                  <>
                    <KeyRound size={16} />
                    {status?.configured
                      ? "Replace saved key"
                      : "Save key to my account"}
                  </>
                )}
              </button>
              {status?.configured && (
                <button
                  className="button outline danger"
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirm(true)}
                >
                  <Trash2 size={15} /> Delete saved key
                </button>
              )}
            </div>
          </form>
        </>
      )}
      {error && (
        <div className="setup-error" role="alert">
          {error}
        </div>
      )}
      <p className="small-copy muted">
        <ShieldCheck size={14} className="inline-icon" /> The key is never
        returned to the browser or stored with your local projects. Signing out
        doesn’t delete it; use Delete saved key to remove it. Saving does not
        verify Google quota or send a photo.
      </p>
      <a
        href="https://aistudio.google.com/apikey"
        target="_blank"
        rel="noopener noreferrer"
        className="text-link"
      >
        Get a Gemini API key in Google AI Studio ↗
      </a>
      {confirm && (
        <Modal
          title="Delete your saved Gemini key?"
          onClose={() => {
            if (!busy) setConfirm(false);
          }}
        >
          <p>
            AI requests will stop until you add another key. Your account and
            local projects are not deleted.
          </p>
          <button
            className="button destructive full"
            disabled={busy}
            onClick={remove}
          >
            {busy ? "Deleting…" : "Delete my saved key"}
          </button>
          <button
            className="button outline full"
            disabled={busy}
            onClick={() => setConfirm(false)}
          >
            Keep key
          </button>
        </Modal>
      )}
    </section>
  );
}
