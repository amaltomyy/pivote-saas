ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_focus_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_shields integer NOT NULL DEFAULT 0;

ALTER TABLE public.pivote_tasks
  ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;

UPDATE public.pivote_tasks SET completed_at = created_at WHERE is_completed = true AND completed_at IS NULL;