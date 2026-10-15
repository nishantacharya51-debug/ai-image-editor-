import { absoluteRoute } from "../lib/paths";
export interface AuthCallbackInput {
  code?: string;
  flowId?: string;
  tokenHash?: string;
  type?: "signup" | "recovery" | "email";
  error?: string;
  next: "/account" | "/reset-password";
}
// Accept the query before a Pages hash or within its route. Never accept an
// arbitrary redirect target. One-time tokens are never stored in localStorage.
export function parseAuthCallback(href: string): AuthCallbackInput | null {
  const url = new URL(href);
  const hash = url.hash.slice(1);
  const fragment = new URLSearchParams(
    hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : hash,
  );
  const get = (key: string) => url.searchParams.get(key) || fragment.get(key);
  if (!["code", "token_hash", "error", "error_code", "access_token"].some(get))
    return null;
  const type = get("type");
  return {
    code: get("code") || undefined,
    flowId: get("sb_flow_id") || undefined,
    tokenHash: get("token_hash") || undefined,
    type:
      type === "signup" || type === "recovery" || type === "email"
        ? type
        : undefined,
    error:
      get("error_code") ||
      get("error") ||
      (get("access_token") ? "unsupported_link" : undefined),
    next:
      get("next") === "reset" ||
      type === "recovery" ||
      hash.startsWith("/reset-password") ||
      url.pathname.endsWith("/reset-password")
        ? "/reset-password"
        : "/account",
  };
}
let pending: AuthCallbackInput | null = null;
export function prepareAuthCallback() {
  pending = parseAuthCallback(window.location.href);
  if (pending)
    window.history.replaceState(null, "", absoluteRoute("/auth/callback"));
}
export function consumeAuthCallback() {
  // A second email may be opened while the SPA is already running. Hash-only
  // navigation does not reload main.tsx, so capture that fresh payload here.
  const input = pending ?? parseAuthCallback(window.location.href);
  if (input)
    window.history.replaceState(
      window.history.state,
      "",
      absoluteRoute("/auth/callback"),
    );
  pending = null;
  return input;
}
export const confirmationRedirect = () => absoluteRoute("/auth/callback");
export const recoveryRedirect = () =>
  absoluteRoute("/auth/callback?next=reset");
