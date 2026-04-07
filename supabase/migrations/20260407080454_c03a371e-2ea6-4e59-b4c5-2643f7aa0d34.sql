
-- Create registrations table
CREATE TABLE public.registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  kk_number TEXT NOT NULL,
  rt_rw TEXT NOT NULL,
  referral_code TEXT NOT NULL UNIQUE,
  queue_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'serving', 'served', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create queue_settings table (single row config)
CREATE TABLE public.queue_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  current_queue_number INTEGER DEFAULT 0,
  current_referral_code TEXT DEFAULT '',
  next_queue_counter INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_settings ENABLE ROW LEVEL SECURITY;

-- Open policies (no auth required)
CREATE POLICY "Anyone can view registrations" ON public.registrations FOR SELECT USING (true);
CREATE POLICY "Anyone can insert registrations" ON public.registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update registrations" ON public.registrations FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete registrations" ON public.registrations FOR DELETE USING (true);

CREATE POLICY "Anyone can view queue_settings" ON public.queue_settings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert queue_settings" ON public.queue_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update queue_settings" ON public.queue_settings FOR UPDATE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_settings;

-- Insert default settings row
INSERT INTO public.queue_settings (current_queue_number, current_referral_code, next_queue_counter) VALUES (0, '', 1);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_registrations_updated_at
  BEFORE UPDATE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_queue_settings_updated_at
  BEFORE UPDATE ON public.queue_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
