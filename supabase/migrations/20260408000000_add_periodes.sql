-- Create periodes table
CREATE TABLE public.periodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add periode_id to warga
ALTER TABLE public.warga ADD COLUMN periode_id UUID REFERENCES public.periodes(id);

-- Add periode_id to queue_settings
ALTER TABLE public.queue_settings ADD COLUMN periode_id UUID REFERENCES public.periodes(id);

-- RLS for periodes
ALTER TABLE public.periodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view periodes" ON public.periodes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert periodes" ON public.periodes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update periodes" ON public.periodes FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete periodes" ON public.periodes FOR DELETE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.periodes;

-- Trigger for updated_at
CREATE TRIGGER update_periodes_updated_at
  BEFORE UPDATE ON public.periodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default periode
INSERT INTO public.periodes (name, is_active) VALUES ('Periode Default', true);

-- Link existing queue_settings to default periode
UPDATE public.queue_settings
SET periode_id = (SELECT id FROM public.periodes WHERE name = 'Periode Default' LIMIT 1);
