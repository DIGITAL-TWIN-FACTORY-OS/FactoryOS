import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://bsiazqbjrwaxgpzxhhqh.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_a_wyU2KOmhslZgHFf7dc9g_mlCWil2h";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_KEY;

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);
