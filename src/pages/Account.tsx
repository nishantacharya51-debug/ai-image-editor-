import { useEffect, useState, type FormEvent } from "react";
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
import { confirmationRedirect, recoveryRedirect } from "../auth/callback";
import { authErrorMessage } from "../auth/errors";
import { BRAND } from "../lib/config";
import { PageHeading, Spinner, useToast } from "../components/UI";
export function AuthPage({
  mode = "login",
}: {
  mode?: "login" | "signup" | "forgot" | "reset";
}) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [confirmationSent, setConfirmationSent] = useState(false);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(
      () => setCooldown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [cooldown]);
  async function resendConfirmation() {
    if (!supabase || busy || cooldown) return;
    setError("");
    setMessage("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(
        "Enter your email address above to request a confirmation link.",
      );
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: { emailRedirectTo: confirmationRedirect() },
      });
      if (error) throw error;
      setMessage(
        "If this address needs confirmation, a new email has been requested. Check your inbox and spam folder, and open the link in this browser.",
      );
      setCooldown(60);
    } catch (error) {
      setError(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }
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
    if (
      !supabase ||
      busy ||
      ((mode === "signup" || mode === "forgot") && cooldown)
    )
      return;
    if ((mode === "signup" || mode === "reset") && password !== confirm) {
      setError("The passwords do not match.");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { display_name: name.trim() },
            emailRedirectTo: confirmationRedirect(),
          },
        });
        if (error) throw error;
        if (data.session) navigate("/account");
        else {
          setMessage(
            "Check your email for the confirmation link. Open it in this browser to finish signing up. Check spam if it does not arrive.",
          );
          setConfirmationSent(true);
          setCooldown(60);
        }
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo: recoveryRedirect(),
          },
        );
        if (error) throw error;
        setCooldown(60);
        setMessage(
          "If an account exists for this address, a password-reset email has been requested. Check your inbox and spam folder.",
        );
      } else if (mode === "reset") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setMessage("Password updated. You can return to your account.");
        setPassword("");
        setConfirm("");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        navigate("/account");
      }
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setPassword("");
      setConfirm("");
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
        {loading ? (
          <Spinner label="Checking your session…" />
        ) : user && (mode === "login" || mode === "signup") ? (
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
                  type={visible ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={mode === "login" ? 1 : 8}
                  maxLength={128}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  required
                  disabled={!cloudConfigured || busy}
                />
              </label>
            )}
            {(mode === "reset" || mode === "signup") && (
              <label className="form-row">
                {mode === "reset" ? "Confirm new password" : "Confirm password"}
                <input
                  type={visible ? "text" : "password"}
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
            {mode !== "forgot" && (
              <button
                type="button"
                className="text-link password-toggle"
                aria-pressed={visible}
                disabled={!cloudConfigured || busy}
                onClick={() => setVisible(!visible)}
              >
                {visible ? "Hide password" : "Show password"}
              </button>
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
              disabled={
                !cloudConfigured ||
                busy ||
                (mode === "reset" && !user) ||
                ((mode === "signup" || mode === "forgot") && cooldown > 0)
              }
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
            {cooldown > 0 && (
              <p className="small-copy muted">
                You can request another email in {cooldown}s.
              </p>
            )}
            {cloudConfigured &&
              (mode === "login" || (mode === "signup" && confirmationSent)) && (
                <button
                  type="button"
                  className="button outline full resend-confirmation"
                  disabled={busy || cooldown > 0}
                  onClick={resendConfirmation}
                >
                  Resend confirmation email
                </button>
              )}
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
      {user && (
        <p>
          <Link className="text-link" to="/forgot-password">
            Change my password by email →
          </Link>
        </p>
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
        eyebrow="ACCOUNT SETUP · FOR THE SITE OWNER"
        title="Connect your account service."
        description="Supabase Auth handles login and signup. Connecting Supabase to GitHub does not automatically configure this website."
      />
      <article className="prose">
        <h2>1. Connect the existing Supabase project</h2>
        <p>
          From Supabase Project Settings → API Keys, copy the project URL and
          public publishable key. Put them in the local, untracked{" "}
          <code>.env</code> as <code>VITE_SUPABASE_URL</code> and{" "}
          <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>. Never use a database
          password, secret key, service-role key, or Gemini key.
        </p>
        <h2>2. Enable email authentication</h2>
        <p>
          Enable the Email provider in Supabase Auth and keep email confirmation
          enabled. Set your live website as the Site URL. Add both callback URLs
          from <code>supabase/README.md</code> to the redirect allowlist. Set
          the minimum password length to 8 or stronger.
        </p>
        <p>
          Public confirmation and reset emails require a configured mail
          provider. Supabase’s default sender is restricted. Do not disable
          confirmation to work around missing email delivery.
        </p>
        <h2>3. Publish the configured frontend</h2>
        <p>
          This site currently publishes from the repository branch root. Run{" "}
          <code>npm run publish:pages</code>, commit the generated files, and
          push the session branch. Adding GitHub Actions variables alone will
          not update this branch-root build.
        </p>
        <h2>4. Test login and signup</h2>
        <p>
          Create an account, open the confirmation email in the same browser,
          log out, and log back in. Reload to check session persistence. Test a
          password-reset email from the live site. The app never stores your
          password.
        </p>
        <h2>Optional: encrypted Gemini key storage</h2>
        <p>
          Login and signup do not require the Gemini database migration or Edge
          Function. To add saved personal Gemini keys, separately follow{" "}
          <code>supabase/README.md</code>: apply the SQL migration, set
          server-only encryption and origin secrets, and deploy{" "}
          <code>ai-gateway</code>. An account connection alone does not activate
          that feature.
        </p>
        <h2>What works before setup?</h2>
        <p>
          Existing sample images, local styles, adjustments, project backups,
          and exports remain available without an account. Login stays disabled
          until public backend configuration is supplied.
        </p>
        <Link to="/editor" className="button dark">
          Keep creating locally <ArrowUpRight size={16} />
        </Link>
      </article>
    </main>
  );
}
