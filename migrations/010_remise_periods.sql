-- Migration 010 : Périodes de validité des conditions commerciales
-- Les dates sont au niveau du fournisseur (s'appliquent à tous les articles)

alter table suppliers
  add column if not exists remise_fourn_debut date,
  add column if not exists remise_fourn_fin   date,
  add column if not exists remise_prod_debut  date,
  add column if not exists remise_prod_fin    date,
  add column if not exists gratuite_debut     date,
  add column if not exists gratuite_fin       date;

comment on column suppliers.remise_fourn_debut is 'Début de validité de la remise fournisseur';
comment on column suppliers.remise_fourn_fin   is 'Fin de validité de la remise fournisseur';
comment on column suppliers.remise_prod_debut  is 'Début de validité de la remise producteur';
comment on column suppliers.remise_prod_fin    is 'Fin de validité de la remise producteur';
comment on column suppliers.gratuite_debut     is 'Début de validité des gratuités';
comment on column suppliers.gratuite_fin       is 'Fin de validité des gratuités';
