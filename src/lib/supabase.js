import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Variabile VITE_SUPABASE_URL mancante nel file .env.local",
  );
}

if (!supabasePublishableKey) {
  throw new Error(
    "Variabile VITE_SUPABASE_PUBLISHABLE_KEY mancante nel file .env.local",
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);