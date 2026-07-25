-- Migration 005 : Infos commerciales fournisseur
-- Enseigne commerciale, code postal et ville

alter table suppliers
  add column if not exists nom_commercial text,
  add column if not exists code_postal text,
  add column if not exists ville text;
