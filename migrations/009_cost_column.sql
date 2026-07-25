-- Migration 009 — Colonne de coût additionnel (droits, taxes)
-- Permet d'ajouter une 2ème colonne du tarif (ex: droits alcool) au prix net pour calculer le prix de revient HT

alter table suppliers
  add column if not exists cost_column text;

alter table price_references
  add column if not exists unit_price_add numeric(10,4);

comment on column suppliers.cost_column is 'Colonne du tarif représentant les droits/taxes additionnels (ex: droits alcool). Optionnel.';
comment on column price_references.unit_price_add is 'Valeur de la colonne cost_column extraite du tarif (0 ou null si absent pour cet article).';
