import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../auth/client";
import { consumeAuthCallback } from "../auth/callback";
import { authErrorMessage } from "../auth/errors";
import { PageHeading, Spinner } from "../components/UI";
async function finishCallback(): Promise<string> {
  const input = consumeAuthCallback();
  if (!supabase)
    throw new Error(
      "Account service is not configured on this deployment yet.",
    );
  if (!input)
    throw new Error(
      "This link is missing or was already opened. Try logging in, or request a new confirmation or password-reset email.",
    );
  if (input.error)
    throw new Error(
      "This email link is expired, invalid, or unsupported. Request a new email and open it in the browser where you started.",
    );
  if (input.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(
      input.code,
      input.flowId ? { flowId: input.flowId } : undefined,
    );
    if (error) throw new Error(authErrorMessage(error));
    if (!data.session)
      throw new Error(
        "The email link did not create a session. Please log in to continue.",
      );
    return "redirectType" in data && data.redirectType === "recovery"
      ? "/reset-password"
      : input.next;
  }
  if (input.tokenHash && input.type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: input.tokenHash,
      type: input.type,
    });
    if (error) throw new Error(authErrorMessage(error));
    if (!data.session)
      throw new Error(
        "Email verification completed without a session. Please log in.",
      );
    return input.next;
  }
  throw new Error(
    "This email link is incomplete. Please request a new confirmation or password-reset email.",
  );
}
export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const request = useRef<Promise<string> | null>(null);
  useEffect(() => {
    let active = true;
    request.current ??= finishCallback();
    request.current
      .then((path) => {
        if (active) navigate(path, { replace: true });
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [navigate]);
  return (
    <main className="page-container narrow">
      <PageHeading
        eyebrow="SECURE ACCOUNT ACCESS"
        title={error ? "Let’s try that link again." : "Opening your studio…"}
        description="Confirming your email link with Supabase Auth."
      />
      {error ? (
        <>
          <p className="setup-error" role="alert">
            {error}
          </p>
          <div className="account-actions">
            <Link className="button dark" to="/login">
              Log in / resend confirmation
            </Link>
            <Link className="button outline" to="/forgot-password">
              Request a password reset
            </Link>
          </div>
          <p className="small-copy muted">
            For standard confirmation links, use the same browser and device
            where you requested the email.
          </p>
        </>
      ) : (
        <Spinner label="Verifying your email link…" />
      )}
      <Link className="text-link" to="/editor">
        Continue with local editing →
      </Link>
    </main>
  );
}
