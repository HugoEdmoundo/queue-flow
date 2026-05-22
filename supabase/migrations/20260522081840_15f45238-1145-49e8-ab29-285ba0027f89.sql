
CREATE TABLE public.periodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX periodes_only_one_active
  ON public.periodes ((is_active)) WHERE is_active = true;

ALTER TABLE public.registrations
  ADD COLUMN periode_id uuid REFERENCES public.periodes(id) ON DELETE CASCADE;

ALTER TABLE public.queue_settings
  ADD COLUMN periode_id uuid REFERENCES public.periodes(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX queue_settings_one_per_periode
  ON public.queue_settings (periode_id);

ALTER TABLE public.periodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view periodes" ON public.periodes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert periodes" ON public.periodes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update periodes" ON public.periodes FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete periodes" ON public.periodes FOR DELETE USING (true);

CREATE TRIGGER set_periodes_updated_at BEFORE UPDATE ON public.periodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.periodes REPLICA IDENTITY FULL;
ALTER TABLE public.queue_settings REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.periodes;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_settings;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
