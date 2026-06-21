import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'https://dvaovixgslfacztmkbkh.supabase.co'
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2YW92aXhnc2xmYWN6dG1rYmtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNjgzNTUsImV4cCI6MjA5NzY0NDM1NX0.zwksb5JXHBfbtTBQ6CIYN2_p4Gsjp0c-vSpsss0srIA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
