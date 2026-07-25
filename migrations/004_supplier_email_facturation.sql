-- ============================================================
-- factur-control — migration 004
-- Ajout email_facturation sur la table suppliers
-- ⚠️ À appliquer dans le SQL Editor Supabase
-- ============================================================

alter table suppliers
  add column if not exists email_facturation text;

comment on column suppliers.email_facturation is
  'Adresse email depuis laquelle le fournisseur envoie ses factures. '
  'Permet l''identification automatique du fournisseur à la réception d''un mail.';
