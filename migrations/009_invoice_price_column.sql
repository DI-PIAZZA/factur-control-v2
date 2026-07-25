-- Migration 009 : colonne de contrôle côté facture par fournisseur
alter table suppliers
  add column if not exists invoice_price_column text;
