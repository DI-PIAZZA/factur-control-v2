-- Migration 007 — Stockage du fichier tarif original (PDF / Excel)
-- Ajoute une colonne tarif_file_path sur la table suppliers
-- pour mémoriser le chemin dans Supabase Storage (bucket "tarifs")

alter table suppliers
  add column if not exists tarif_file_path text;
