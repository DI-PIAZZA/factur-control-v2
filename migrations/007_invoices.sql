-- Migration 007 : tables factures et lignes de facture

create type invoice_status as enum ('pending', 'checked', 'error');
create type line_type as enum ('article', 'consigne', 'remise_globale');

-- Table des factures
create table invoices (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  supplier_id   uuid not null references suppliers(id) on delete cascade,
  invoice_number text,
  invoice_date  date,
  status        invoice_status not null default 'pending',
  total_ht      numeric(12,4) default 0,
  created_at    timestamptz not null default now()
);

-- Table des lignes de facture
create table invoice_lines (
  id                  uuid primary key default gen_random_uuid(),
  invoice_id          uuid not null references invoices(id) on delete cascade,
  supplier_id         uuid not null references suppliers(id) on delete cascade,
  ref_article         text,
  label               text not null,
  quantity            numeric(10,4) default 1,
  unit_price_invoiced numeric(10,4) not null default 0,
  unit                text,
  line_total          numeric(12,4) default 0,
  line_type           line_type not null default 'article',
  created_at          timestamptz not null default now()
);

-- Index
create index idx_invoices_tenant    on invoices(tenant_id);
create index idx_invoices_supplier  on invoices(supplier_id);
create index idx_invoice_lines_inv  on invoice_lines(invoice_id);

-- RLS
alter table invoices      enable row level security;
alter table invoice_lines enable row level security;

create policy "tenant_invoices" on invoices
  using (tenant_id = current_tenant_id());

create policy "tenant_invoice_lines" on invoice_lines
  using (supplier_id in (
    select id from suppliers where tenant_id = current_tenant_id()
  ));

-- Droits d'accès (obligatoire en plus des politiques RLS)
grant select, insert, update, delete on invoices      to anon, authenticated;
grant select, insert, update, delete on invoice_lines to anon, authenticated;
