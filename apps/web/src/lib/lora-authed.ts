import { createLoraClient } from "@lora/sdk";
import { supabase } from "./supabase";

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

/**
 * Authenticated LORA client for admin pages. Attaches the current Supabase
 * access token to every request; the API verifies it and scopes data to the
 * user's tenant. Use only in client components.
 */
export const loraAuthed = createLoraClient({
  baseUrl,
  token: async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? "";
  },
});
