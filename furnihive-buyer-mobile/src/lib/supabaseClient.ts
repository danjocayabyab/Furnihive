import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://flwvghsjwhxtwlzgylao.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsd3ZnaHNqd2h4dHdsemd5bGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMTk1OTcsImV4cCI6MjA3ODU5NTU5N30.FZlmM3FqlnGTeREl03JoycIgxkEJu_uzXpTLWNTcmlQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);