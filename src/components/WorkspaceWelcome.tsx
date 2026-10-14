import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  KeyRound,
  ShieldCheck,
  Sparkles,
  X,
  Check,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { BRAND } from "../lib/config";
export const welcomeStorageKey = (userId = "guest") =>
  `acharya-welcome-v2:${userId}`;
export function WorkspaceWelcome() {
  const { pathname } = useLocation(),
    navigate = useNavigate();
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const key = welcomeStorageKey(user?.id);
  useEffect(() => {
    const workspace =
      pathname === "/projects" || pathname.startsWith("/editor");
    if (!workspace || loading) {
      setOpen(false);
      return;
    }
    let seen = false;
    try {
      seen = localStorage.getItem(key) === "done";
    } catch {
      /* The welcome remains optional if storage is unavailable. */
    }
    setOpen(!seen);
  }, [pathname, key, loading]);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  function dismiss() {
    try {
      localStorage.setItem(key, "done");
    } catch {
      /* Never block editing on storage failure. */
    }
    setOpen(false);
  }
  if (!open) return null;
  return (
    <dialog
      ref={dialog}
      className="welcome-dialog"
      onCancel={dismiss}
      aria-labelledby="welcome-title"
    >
      <button
        className="welcome-close icon-button"
        aria-label="Skip welcome and edit locally"
        onClick={dismiss}
      >
        <X size={19} />
      </button>
      <div className="welcome-art">
        <span className="magic-orbit orbit-one" />
        <span className="magic-orbit orbit-two" />
        <span className="magic-orbit orbit-three" />
        <span className="magic-spark spark-one">✧</span>
        <span className="magic-spark spark-two">✦</span>
        <img src={BRAND.logo} alt="Acharya enchanted A crest" />
        <span className="magic-caption">IMAGINATION, AWAKENED</span>
      </div>
      <div className="welcome-content">
        <span className="eyebrow">
          <Sparkles size={13} /> WELCOME TO {BRAND.name} {BRAND.suffix}
        </span>
        <h2 id="welcome-title">
          A little magic.
          <br />
          <em>Entirely yours.</em>
        </h2>
        <p>
          Bring your Gemini API key for a more intelligent studio. Connect it
          once to your account, and it’s ready whenever you log in.
        </p>
        <div className="welcome-steps">
          <span>
            <i>01</i> {user ? "You’re signed in" : "Create your free account"}
            {user && <Check size={13} />}
          </span>
          <span>
            <i>02</i> Add your own Gemini key
          </span>
          <span>
            <i>03</i> Turn a photo into a possibility
          </span>
        </div>
        <button
          className="button lime full"
          onClick={() => {
            dismiss();
            navigate(user ? "/account" : "/signup");
          }}
        >
          <KeyRound size={16} />
          {user ? "Connect my Gemini key" : "Create account & connect Gemini"}
          <ArrowUpRight size={16} />
        </button>
        <button className="welcome-skip" onClick={dismiss}>
          Continue with free local tools →
        </button>
        <p className="welcome-disclosure">
          <ShieldCheck size={13} /> A key is not a login password. Google’s free
          quota and regional availability apply. Local editing never needs a
          key.
        </p>
        <small>
          Designed & developed by <strong>{BRAND.developer}</strong>
        </small>
      </div>
    </dialog>
  );
}
