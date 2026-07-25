-- Migration 012 : bucket Supabase Storage pour les PDFs de factures

insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false)
on conflict (id) do nothing;

-- Upload autorisé pour les utilisateurs authentifiés
create policy "Upload invoices" on storage.objects
for insert to authenticated
with check (bucket_id = 'invoices');

-- Lecture autorisée pour les utilisateurs authentifiés
create policy "Read invoices" on storage.objects
for select to authenticated
using (bucket_id = 'invoices');

-- Suppression autorisée pour les utilisateurs authentifiés
create policy "Delete invoices" on storage.objects
for delete to authenticated
using (bucket_id = 'invoices');
