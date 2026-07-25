-- ============================================================
-- Relevés de factures (factures antérieures référencées)
-- ============================================================

create table invoice_references (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  referenced_invoice_number text,
  referenced_invoice_date date,
  referenced_amount_ht numeric(10,2),
  referenced_amount_ttc numeric(10,2),
  created_at timestamptz not null default now()
);

alter table invoice_references enable row level security;

create index on invoice_references(invoice_id);
create index on invoice_references(tenant_id);
