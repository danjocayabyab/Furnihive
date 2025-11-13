import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn("[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Check .env.local and restart dev server.", {
    urlPresent: Boolean(supabaseUrl),
    keyPresent: Boolean(supabaseAnonKey),
  });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

//almacen