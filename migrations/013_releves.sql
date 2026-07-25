-- Table relevés de compte fournisseur
create table if not exists releves (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  supplier_id uuid references suppliers(id),
  file_url text,
  created_at timestamptz default now()
);

alter table releves enable row level security;
create policy "releves tenant" on releves
  for all using (tenant_id = current_tenant_id());

-- Lignes extraites du relevé
create table if not exists releve_lines (
  id uuid primary key default gen_random_uuid(),
  releve_id uuid not null references releves(id) on delete cascade,
  invoice_number text,
  amount_ht numeric(12,2),
  status text default 'missing', -- 'found' ou 'missing'
  matched_invoice_id uuid references invoices(id),
  created_at timestamptz default now()
);

alter table releve_lines enable row level security;
create policy "releve_lines tenant" on releve_lines
  for all using (
    releve_id in (select id from releves where tenant_id = current_tenant_id())
  );
