-- Migration 006 : ajout des colonnes remises sur price_references
alter table price_references
  add column if not exists remise_fournisseur_valeur numeric(10,4) default 0,
  add column if not exists remise_fournisseur_pct    numeric(6,4)  default 0,
  add column if not exists remise_producteur_valeur  numeric(10,4) default 0,
  add column if not exists remise_producteur_pct     numeric(6,4)  default 0;
