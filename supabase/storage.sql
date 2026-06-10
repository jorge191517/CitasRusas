-- VELOURA STORAGE CONFIGURATIONS AND SECURITY POLICIES
-- Create buckets if they do not exist

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-documents', 'verification-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Enable storage RLS policies
-- Note: storage.objects already has RLS enabled by default in Supabase

-- ===================================================
-- 1. profile-photos Policies (Public bucket)
-- ===================================================
CREATE POLICY "Anyone can view profile photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-photos');

CREATE POLICY "Authenticated users can upload profile photos to their own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update or delete their own profile photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-photos' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own profile photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-photos' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ===================================================
-- 2. verification-documents Policies (Private bucket)
-- ===================================================
CREATE POLICY "Users can view their own verification documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'verification-documents' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can upload their own verification documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'verification-documents' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );
