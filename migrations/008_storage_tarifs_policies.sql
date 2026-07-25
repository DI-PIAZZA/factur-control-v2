-- Migration 008 — Policies RLS pour le bucket "tarifs" (Supabase Storage)
-- Permet aux utilisateurs authentifiés d'uploader et lire leurs tarifs

create policy "Authenticated can insert tarifs"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'tarifs');

create policy "Authenticated can select tarifs"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'tarifs');

create policy "Authenticated can update tarifs"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'tarifs');

create policy "Authenticated can delete tarifs"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'tarifs');
