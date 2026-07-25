-- ============================================================
-- Ajouter email du fournisseur pour envoi automatique d'avoirs
-- ============================================================

alter table suppliers add column email_contact text;

create index on suppliers(email_contact);
