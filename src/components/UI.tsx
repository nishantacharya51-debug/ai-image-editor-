import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  ArrowUpRight,
  Menu,
  X,
  Aperture,
  ArrowRight,
  Check,
  LoaderCircle,
} from "lucide-react";
import { BRAND } from "../lib/config";
import { useAuth } from "../auth/AuthProvider";
export function Logo() {
  return (
    <Link to="/" className="logo" aria-label={`${BRAND.full} home`}>
      <span className="logo-mark">
        <img src={BRAND.logo} alt="" width={35} height={35} />
      </span>
      <span>
        {BRAND.name}
        <span className="logo-suffix">{BRAND.suffix}</span>
      </span>
    </Link>
  );
}
export function Header() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname, hash } = useLocation();
  useEffect(() => {
    setOpen(false);
    if (hash)
      requestAnimationFrame(() =>
        document
          .getElementById(hash.slice(1))
          ?.scrollIntoView({ behavior: "smooth" }),
      );
    else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return (
    <header className="site-header">
      <div className="header-inner">
        <Logo />
        <nav className={open ? "main-nav open" : "main-nav"}>
          <NavLink to="/" end>
            Product
          </NavLink>
          <NavLink to="/explore">Explore styles</NavLink>
          <Link to="/#features">Features</Link>
          <Link to="/#how-it-works">How it works</Link>
        </nav>
        <div className="header-actions">
          <NavLink className="workspace-link" to="/projects">
            My workspace
          </NavLink>
          <NavLink className="auth-nav" to={user ? "/account" : "/login"}>
            {user ? "My account" : "Log in"}
          </NavLink>
          <Link className="button dark small" to="/editor">
            Open Editor <ArrowUpRight size={15} />
          </Link>
          <button
            className="icon-button mobile-menu"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div>
          <Logo />
          <p>
            A little intelligence.
            <br />A lot of creative possibility.
          </p>
        </div>
        <div>
          <h4>CREATE</h4>
          <Link to="/editor">Photo editor</Link>
          <Link to="/explore">Explore styles</Link>
          <Link to="/presets">Preset library</Link>
          <Link to="/compare">Compare edits</Link>
        </div>
        <div>
          <h4>WORKSPACE</h4>
          <Link to="/projects">Your projects</Link>
          <Link to="/history">Recent activity</Link>
          <Link to="/settings">Preferences</Link>
          <Link to="/account">Account & Gemini key</Link>
        </div>
        <div>
          <h4>GOOD TO KNOW</h4>
          <Link to="/pricing">Free, by design</Link>
          <Link to="/help">Help & shortcuts</Link>
          <Link to="/privacy">Privacy policy</Link>
          <Link to="/terms">Terms of use</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} {BRAND.full}. Developed by{" "}
          <strong>{BRAND.developer}</strong>.
        </span>
        <span>
          <i className="status-dot" /> Local-first. Creativity always.
        </span>
      </div>
    </footer>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export function Empty({
  title,
  description,
  action = "Start a project",
  to = "/editor",
}: {
  title: string;
  description: string;
  action?: string;
  to?: string;
}) {
  return (
    <div className="empty-state">
      <Aperture size={40} />
      <h2>{title}</h2>
      <p>{description}</p>
      <Link to={to} className="button dark">
        {action}
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}
export function Spinner({ label = "Processing…" }: { label?: string }) {
  return (
    <span className="spinner">
      <LoaderCircle size={17} className="spin" />
      {label}
    </span>
  );
}
const ToastContext = createContext<(message: string, error?: boolean) => void>(
  () => {},
);
export const useToast = () => useContext(ToastContext);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((message: string, error = false) => {
    clearTimeout(timer.current);
    setToast({ message, error });
    timer.current = setTimeout(() => setToast(null), 5000);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div
          className={`toast ${toast.error ? "error" : ""}`}
          role={toast.error ? "alert" : "status"}
        >
          {toast.error ? <X size={18} /> : <Check size={18} />}
          <span>{toast.message}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
