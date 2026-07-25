-- Migration 008 : colonne de contrôle par fournisseur
alter table suppliers
  add column if not exists price_column text;
