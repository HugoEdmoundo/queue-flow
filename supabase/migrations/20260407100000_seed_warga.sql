-- Seed example warga data
INSERT INTO public.warga (name, kk_number, rt_rw, referral_code, queue_number, status)
VALUES
  ('Adi Nugraha', '3174010101234567', '001/002', 'AB12CD', 1, 'waiting'),
  ('Siti Aminah', '3174010207654321', '003/004', 'EF34GH', 2, 'waiting'),
  ('Budi Santoso', '3174010301122334', '005/006', 'IJ56KL', 3, 'waiting')
ON CONFLICT (referral_code) DO NOTHING;
