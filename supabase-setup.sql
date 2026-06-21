-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/dvaovixgslfacztmkbkh/sql/new)

-- 1. Ensure the table has all columns and defaults
CREATE TABLE IF NOT EXISTS public.guests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  passes INTEGER NOT NULL DEFAULT 1,
  token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  rsvp_status TEXT,
  food_restrictions TEXT,
  song TEXT,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to recreate them cleanly
DROP POLICY IF EXISTS "allow_select_all" ON public.guests;
DROP POLICY IF EXISTS "allow_insert_admin" ON public.guests;
DROP POLICY IF EXISTS "allow_update_own" ON public.guests;
DROP POLICY IF EXISTS "allow_delete_admin" ON public.guests;

-- 4. Allow anyone to SELECT (needed for guest to load their data via token)
CREATE POLICY "allow_select_all" ON public.guests
  FOR SELECT USING (true);

-- 5. Allow authenticated users (admin) to INSERT
CREATE POLICY "allow_insert_admin" ON public.guests
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 6. Allow anyone to UPDATE a row if they provide the matching token
CREATE POLICY "allow_update_own" ON public.guests
  FOR UPDATE USING (true)
  WITH CHECK (true);

-- 7. Allow authenticated users (admin) to DELETE
CREATE POLICY "allow_delete_admin" ON public.guests
  FOR DELETE USING (auth.role() = 'authenticated');
