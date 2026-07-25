-- Migration 011 : ajout de l'URL du PDF original sur les factures
alter table invoices add column if not exists file_url text;
