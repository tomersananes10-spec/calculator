import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Hosted on coe-hub under a dedicated Postgres schema (schema-per-app architecture).
// All eligibility tables live in the `eligibility` schema; storage buckets are project-wide.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'eligibility' },
})
