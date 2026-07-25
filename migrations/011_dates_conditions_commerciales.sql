-- Migration 011 : Refonte des dates conditions commerciales
-- Fournisseur = global (sur suppliers)
-- Producteur = par ligne de tarif (sur price_references)

-- 1. Supprimer les colonnes producteur mal placées sur suppliers
alter table suppliers
  drop column if exists remise_prod_debut,
  drop column if exists remise_prod_fin,
  drop column if exists gratuite_debut,
  drop column if exists gratuite_fin;

-- 2. Ajouter RFA fournisseur (global = sur suppliers)
alter table suppliers
  add column if not exists rfa_fourn_debut date,
  add column if not exists rfa_fourn_fin   date;

-- 3. Ajouter dates producteur sur price_references (par ligne de tarif)
alter table price_references
  add column if not exists gratuite_debut  date,
  add column if not exists gratuite_fin    date,
  add column if not exists rfa_prod_debut  date,
  add column if not exists rfa_prod_fin    date;
