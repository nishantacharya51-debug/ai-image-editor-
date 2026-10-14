import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const publicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const cloudConfigured =
  !!url && !!publicKey && /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url);
export const supabase = cloudConfigured
  ? createClient(url!, publicKey!, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
export async function cloudRequest<T>(
  action: string,
  body: Record<string, unknown> = {},
): Promise<T> {
  if (!supabase)
    throw new Error(
      "Online accounts are not configured yet. Local editing is available.",
    );
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Please log in to use your saved Gemini key.");
  const { data, error } = await supabase.functions.invoke("ai-gateway", {
    body: { action, ...body },
  });
  if (error) {
    let message =
      "The account service could not be reached. Please check your connection and try again.";
    try {
      const payload = await error.context?.json();
      if (typeof payload?.error === "string") message = payload.error;
    } catch {
      /* Never expose raw provider errors that could contain credentials. */
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}
