-- ============================================================
-- factur-control — migration 003
-- Colonnes 6 zones tarifaires + métadonnées extraction IA
-- ⚠️ À appliquer dans le SQL Editor Supabase APRÈS 001 et 002
-- ============================================================

-- ============================================================
-- 1. PRICE_REFERENCES — 6 zones tarifaires
--    (colonnes nullable : BETA n'utilise que unit_price = Net Facture,
--     les autres zones seront remplies en V1 module Marges)
-- ============================================================

alter table price_references
  -- Zone 1 : Tarif de base (catalogue fournisseur)
  add column if not exists tarif_base_ht         numeric(10,4),

  -- Zone 2 : Remise fournisseur (% et/ou montant fixe)
  add column if not exists remise_fourn_pct       numeric(6,4),   -- ex: 0.05 = 5%
  add column if not exists remise_fourn_eur       numeric(10,4),  -- montant fixe €

  -- Zone 3 : Tarif Net Facture (contrôlé par l'app — couleur verte)
  -- C'est l'actuel unit_price. Les colonnes ci-dessus permettront de le recalculer.

  -- Zone 4 : Gratuité Producteur
  add column if not exists gratuite_x             integer,        -- X achetés
  add column if not exists gratuite_y             integer,        -- Y gratuits (même produit)

  -- Zone 5 : RFA Producteur
  add column if not exists rfa_producteur_pct     numeric(6,4),
  add column if not exists rfa_producteur_eur     numeric(10,4),

  -- Zone 6 : RFA Fournisseur
  add column if not exists rfa_fourn_pct          numeric(6,4),
  add column if not exists rfa_fourn_eur          numeric(10,4),

  -- Prix de Revient Net Net (calculé — couleur orange)
  -- Stocké pour éviter de recalculer à chaque requête
  add column if not exists net_net                numeric(10,4),

  -- Source du tarif (extraction IA, saisie manuelle, import Excel...)
  add column if not exists origin                 text default 'manual',
                                                  -- 'manual' | 'ai_extraction' | 'excel_import'
  -- PDF source (Storage path)
  add column if not exists source_pdf_path        text;

-- ============================================================
-- 2. INVOICES — métadonnées extraction IA
-- ============================================================

alter table invoices
  add column if not exists extraction_confidence  text,    -- 'high' | 'medium' | 'low'
  add column if not exists extraction_cost_usd    numeric(8,6),
  add column if not exists total_amount_ht        numeric(10,4),
  add column if not exists total_amount_ttc       numeric(10,4),
  add column if not exists tva_amount             numeric(10,4);

-- ============================================================
-- 3. INVOICE_LINES — debug extraction + TVA
-- ============================================================

alter table invoice_lines
  add column if not exists tva_rate              numeric(5,4) default 0.20,  -- 20% défaut
  add column if not exists raw_extracted_text    text;   -- texte brut extrait par LLM (debug)

-- ============================================================
-- 4. RECONCILIATION_ALERTS — complément
-- ============================================================

alter table reconciliation_alerts
  -- Type d'alerte : sur-facturation ou hors-tarif
  add column if not exists alert_type            text not null default 'price_gap';
                                                 -- 'price_gap' | 'not_in_tariff'

comment on column reconciliation_alerts.alert_type is
  'price_gap = prix facturé > prix tarif (delta > 0.01) | not_in_tariff = article absent du référentiel';
