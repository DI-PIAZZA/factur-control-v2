-- ============================================================
-- factur-control — schéma initial
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. TENANTS
-- ============================================================
create table tenants (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  created_at timestamptz not null default now()
);

alter table tenants enable row level security;

-- ============================================================
-- 2. SUPPLIERS
-- ============================================================
create table suppliers (
  id           uuid primary key default uuid_generate_v4(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  name         text not null,
  siret        text,
  price_column text,                         -- colonne tarifaire choisie par fournisseur
  created_at   timestamptz not null default now(),
  unique (tenant_id, siret)                  -- déduplication par tenant
);

alter table suppliers enable row level security;

create index on suppliers(tenant_id);

-- ============================================================
-- 3. PRICE_REFERENCES
-- ============================================================
create table price_references (
  id          uuid primary key default uuid_generate_v4(),
  supplier_id uuid not null references suppliers(id) on delete cascade,
  ref_article text not null,
  label       text,
  unit_price  numeric(10,4) not null,
  unit        text,
  valid_from  date not null default current_date,
  valid_to    date                                -- null = tarif actif
);

alter table price_references enable row level security;

create index on price_references(supplier_id);
create index on price_references(ref_article);

-- ============================================================
-- 4. INVOICES
-- ============================================================
create type invoice_status as enum ('pending', 'extracted', 'reconciled', 'error');

create table invoices (
  id             uuid primary key default uuid_generate_v4(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  supplier_id    uuid references suppliers(id) on delete set null,
  invoice_number text,
  invoice_date   date,
  file_path      text,                          -- chemin Supabase Storage
  status         invoice_status not null default 'pending',
  created_at     timestamptz not null default now()
);

alter table invoices enable row level security;

create index on invoices(tenant_id);
create index on invoices(supplier_id);
create index on invoices(status);

-- ============================================================
-- 5. INVOICE_LINES
-- ============================================================
create type line_type as enum ('article', 'consigne', 'remise_globale');

create table invoice_lines (
  id          uuid primary key default uuid_generate_v4(),
  invoice_id  uuid not null references invoices(id) on delete cascade,
  line_type   line_type not null default 'article',
  ref_article text,
  label       text,
  quantity    numeric,
  unit_price  numeric(10,4),
  total       numeric(10,4)
);

alter table invoice_lines enable row level security;

create index on invoice_lines(invoice_id);
create index on invoice_lines(line_type);

-- ============================================================
-- 6. RECONCILIATION_ALERTS
-- ============================================================
create table reconciliation_alerts (
  id              uuid primary key default uuid_generate_v4(),
  invoice_line_id uuid not null references invoice_lines(id) on delete cascade,
  price_ref_id    uuid references price_references(id) on delete set null,
  invoiced_price  numeric(10,4) not null,
  ref_price       numeric(10,4) not null,
  delta           numeric(10,4) not null,       -- invoiced_price - ref_price, toujours > 0.01
  created_at      timestamptz not null default now()
);

alter table reconciliation_alerts enable row level security;

create index on reconciliation_alerts(invoice_line_id);
