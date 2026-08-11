
CREATE TABLE public.pivote_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pivote_phases TO authenticated;
GRANT ALL ON public.pivote_phases TO service_role;
ALTER TABLE public.pivote_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own phases" ON public.pivote_phases FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.pivote_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id uuid NOT NULL REFERENCES public.pivote_phases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  proof_image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pivote_tasks TO authenticated;
GRANT ALL ON public.pivote_tasks TO service_role;
ALTER TABLE public.pivote_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tasks" ON public.pivote_tasks FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.pivote_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_date date NOT NULL DEFAULT current_date,
  minutes_spent integer NOT NULL DEFAULT 0,
  last_active timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, session_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pivote_usage_logs TO authenticated;
GRANT ALL ON public.pivote_usage_logs TO service_role;
ALTER TABLE public.pivote_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own usage" ON public.pivote_usage_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX pivote_tasks_phase_idx ON public.pivote_tasks(phase_id);
CREATE INDEX pivote_phases_user_idx ON public.pivote_phases(user_id);

CREATE POLICY "own proofs read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'task_proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own proofs insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'task_proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own proofs update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'task_proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own proofs delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'task_proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
