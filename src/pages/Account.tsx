import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  KeyRound,
  ShieldCheck,
  Mail,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { supabase, cloudConfigured } from "../auth/client";
import { PersonalGeminiSettings } from "../auth/PersonalGeminiSettings";
import { absoluteRoute } from "../lib/paths";
import { BRAND } from "../lib/config";
import { PageHeading, Spinner, useToast } from "../components/UI";
export function AuthPage({
  mode = "login",
}: {
  mode?: "login" | "signup" | "forgot" | "reset";
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const title =
    mode === "signup"
      ? "A little magic starts here."
      : mode === "forgot"
        ? "Let’s get you back in."
        : mode === "reset"
          ? "A fresh start. A new password."
          : "Welcome back, creator.";
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name.trim() },
            emailRedirectTo: absoluteRoute("/account"),
          },
        });
        if (error) throw error;
        if (data.session) navigate("/account");
        else
          setMessage(
            "Check your email for the confirmation link, then return to log in.",
          );
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: absoluteRoute("/reset-password"),
        });
        if (error) throw error;
        setMessage(
          "If an account exists for this address, a password-reset email has been requested. Check your inbox and spam folder.",
        );
      } else if (mode === "reset") {
        if (password !== confirm)
          throw new Error("The passwords do not match.");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setMessage("Password updated. You can return to your account.");
        setPassword("");
        setConfirm("");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate("/account");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPassword("");
      setBusy(false);
    }
  }
  return (
    <main className="auth-page page-container">
      <div className="auth-story">
        <div className="fantasy-seal">
          <img src={BRAND.logo} alt="Acharya fantasy crest" />
          <span />
          <i />
        </div>
        <span className="eyebrow">YOUR IMAGINATION HAS A HOME</span>
        <h1>{title}</h1>
        <p>
          Keep your AI connection with you.
          <br />
          Let your photos become something extraordinary.
        </p>
        <div className="auth-benefits">
          <span>
            <KeyRound size={17} /> A saved Gemini key, just for your account
          </span>
          <span>
            <ShieldCheck size={17} /> Encrypted key storage, never public
          </span>
          <span>
            <Sparkles size={17} /> Local editing always stays free
          </span>
        </div>
        <small>Designed & developed by {BRAND.developer}</small>
      </div>
      <div className="auth-card">
        <h2>
          {mode === "signup"
            ? "Create your account"
            : mode === "forgot"
              ? "Reset your password"
              : mode === "reset"
                ? "Choose a new password"
                : "Log in to your studio"}
        </h2>
        <p className="muted small-copy">
          Use an email and password to log in—not your Gemini API key.
        </p>
        {!cloudConfigured && (
          <div className="notice">
            Account service is not configured on this deployment yet. No account
            will be created and no credentials will be sent.
            <br />
            <Link className="text-link" to="/setup">
              Connect the free account backend →
            </Link>
          </div>
        )}
        {user && mode !== "reset" ? (
          <>
            <div className="notice">
              You’re already signed in as {user.email}.
            </div>
            <Link className="button dark full" to="/account">
              Go to my account
            </Link>
          </>
        ) : (
          <form onSubmit={submit}>
            {mode === "signup" && (
              <label className="form-row">
                Your name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={70}
                  autoComplete="name"
                  required
                  disabled={!cloudConfigured || busy}
                />
              </label>
            )}
            {mode !== "reset" && (
              <label className="form-row">
                Email address
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  maxLength={254}
                  required
                  disabled={!cloudConfigured || busy}
                />
              </label>
            )}
            {mode !== "forgot" && (
              <label className="form-row">
                {mode === "reset" ? "New password" : "Password"}
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  maxLength={128}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  required
                  disabled={!cloudConfigured || busy}
                />
              </label>
            )}
            {mode === "reset" && (
              <label className="form-row">
                Confirm new password
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                  disabled={!cloudConfigured || busy}
                />
              </label>
            )}
            {mode === "signup" && (
              <p className="small-copy muted">
                By creating an account, you agree to the{" "}
                <Link className="text-link" to="/terms">
                  Terms
                </Link>{" "}
                and{" "}
                <Link className="text-link" to="/privacy">
                  Privacy policy
                </Link>
                . At least 8 characters for your password.
              </p>
            )}
            {error && (
              <p className="setup-error" role="alert">
                {error}
              </p>
            )}
            {message && (
              <div className="notice" role="status">
                <Mail size={16} /> {message}
              </div>
            )}
            <button
              className="button dark full"
              disabled={!cloudConfigured || busy || (mode === "reset" && !user)}
            >
              {busy ? (
                <Spinner />
              ) : mode === "signup" ? (
                "Create free account"
              ) : mode === "forgot" ? (
                "Send reset link"
              ) : mode === "reset" ? (
                "Update password"
              ) : (
                "Log in"
              )}{" "}
              {!busy && <ArrowUpRight size={16} />}
            </button>
            {mode === "reset" && !user && cloudConfigured && (
              <p className="small-copy muted">
                Open the password-reset link from your email to continue.
              </p>
            )}
          </form>
        )}
        <div className="auth-links">
          {mode === "login" ? (
            <>
              <Link to="/signup">New here? Create an account</Link>
              <Link to="/forgot-password">Forgot password?</Link>
            </>
          ) : (
            <Link to="/login">Already have an account? Log in</Link>
          )}
          <Link to="/editor">Continue with local editing →</Link>
        </div>
        <div className="auth-footnote">
          Projects stay in this browser. Only your account and encrypted AI key
          are stored online.
        </div>
      </div>
    </main>
  );
}
export function Account() {
  const { user, loading, signOut } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <main className="page-container narrow">
      <PageHeading
        eyebrow="YOUR CREATIVE IDENTITY"
        title="One account. Your own magic."
        description={
          user
            ? `Signed in as ${user.email}`
            : "Create an account to keep your Gemini connection across logins."
        }
      />
      {loading ? (
        <Spinner label="Checking your session…" />
      ) : user ? (
        <div className="settings-section account-summary">
          <div>
            <span className="eyebrow">WELCOME BACK</span>
            <h2>
              {typeof user.user_metadata?.display_name === "string"
                ? user.user_metadata.display_name.slice(0, 70)
                : "Creator"}
            </h2>
            <p>{user.email}</p>
          </div>
          <button
            className="button outline"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await signOut();
                toast(
                  "Signed out. Your saved key remains securely stored for next time.",
                );
              } catch (e) {
                toast((e as Error).message, true);
              } finally {
                setBusy(false);
              }
            }}
          >
            <LogOut size={16} />
            {busy ? "Signing out…" : "Log out"}
          </button>
        </div>
      ) : (
        <div className="account-actions">
          <Link className="button dark" to="/login">
            Log in
          </Link>
          <Link className="button outline" to="/signup">
            Create free account
          </Link>
        </div>
      )}
      <PersonalGeminiSettings />
      <div className="notice">
        This is not photo cloud storage. Projects still live in this browser;
        use a project backup to move them between devices. Signing out does not
        erase local projects, so clear site data when using a shared device.
      </div>
      <Link to="/projects" className="button dark">
        Open my workspace <ArrowUpRight size={16} />
      </Link>
    </main>
  );
}
export function CloudSetup() {
  return (
    <main className="page-container narrow">
      <PageHeading
        eyebrow="FREE CLOUD SETUP · FOR THE SITE OWNER"
        title="Connect your account service."
        description="GitHub Pages serves the site. Supabase provides real accounts and encrypted per-user Gemini key storage."
      />
      <article className="prose">
        <h2>1. Create a Supabase Free project</h2>
        <p>
          Create your project in the Supabase dashboard. Keep billing disabled.
          Its free plan has quotas and may pause inactive projects. No account
          or provider resource was silently created by this app.
        </p>
        <h2>2. Apply the included backend</h2>
        <p>
          Follow <code>supabase/README.md</code> in the repository. Run the SQL
          migration, set a server-only 32-byte encryption secret and allowed
          website origin, and deploy the <code>ai-gateway</code> Edge Function.
          Never put service-role keys or the encryption secret in GitHub
          frontend variables.
        </p>
        <h2>3. Configure the website build</h2>
        <p>
          Add repository Actions variables <code>VITE_SUPABASE_URL</code> and{" "}
          <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>. These are the public
          project URL and public publishable key—not the service-role key.
          Re-run the “Publish Acharya Stdio” workflow.
        </p>
        <h2>4. Enable real email login</h2>
        <p>
          Enable the Email provider in Supabase Auth. Set your Pages address as
          Site URL and allow the site's login/reset callback URLs.
          Email-confirmation and recovery delivery require a configured mail
          provider for public users; Supabase's default sender is restricted and
          rate limited. Keep confirmations enabled for production.
        </p>
        <h2>5. Connect your personal Gemini key</h2>
        <p>
          Sign up, confirm your email, log in, then open Account → Your personal
          Gemini key. Your API key is encrypted server-side and reused after
          future logins. It is not a password, and saving it does not call
          Google or buy credits.
        </p>
        <h2>What works before setup?</h2>
        <p>
          Uploading, local analysis, styles, adjustments, offline prompt rules,
          project backups, and exports remain available. Login and cloud-key
          actions are explicitly unavailable until the backend is configured.
        </p>
        <Link to="/editor" className="button dark">
          Keep creating locally <ArrowUpRight size={16} />
        </Link>
      </article>
    </main>
  );
}
