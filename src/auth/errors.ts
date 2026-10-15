export function authErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";
  switch (code) {
    case "invalid_credentials":
      return "The email or password is incorrect. Please try again.";
    case "email_not_confirmed":
      return "Confirm your email before logging in. You can request a new confirmation below.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many attempts. Please wait a few minutes before trying again.";
    case "signup_disabled":
      return "New accounts are currently disabled by the site owner.";
    case "email_provider_disabled":
      return "Email login is not enabled on this Supabase project yet.";
    case "email_address_not_authorized":
      return "Email delivery is not enabled for public users yet. The site owner needs to configure Supabase Auth email delivery.";
    case "email_address_invalid":
      return "Please enter a valid email address.";
    case "weak_password":
      return "Choose a stronger password: at least 8 characters, with a mix of letters, numbers, and symbols.";
    case "same_password":
      return "Please choose a password different from your current password.";
    case "user_already_exists":
      return "Unable to create this account. Try logging in or resetting your password.";
    case "otp_expired":
    case "flow_state_not_found":
    case "flow_state_expired":
    case "bad_code_verifier":
    case "pkce_code_verifier_not_found":
    case "validation_failed":
      return "This link is expired, already used, or belongs to another browser. Request a new email and open it in the browser where you started.";
    case "session_not_found":
    case "refresh_token_not_found":
      return "Your session has expired. Please log in again.";
  }
  if (
    error instanceof TypeError ||
    (error instanceof Error && /fetch|network|connection/i.test(error.message))
  )
    return "Could not reach the account service. Check your connection and try again.";
  return "The account request could not be completed. Please try again. If it continues, ask the site owner to check Supabase Auth and email delivery.";
}
