-- ============================================================
-- factur-control — table profiles + politiques RLS
-- ============================================================

-- ============================================================
-- TABLE PROFILES
-- Lien entre auth.users et tenants (1 user = 1 tenant)
-- ============================================================
create table profiles (
  id        uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  role      text not null default 'user'   -- 'admin' ou 'user'
);

alter table profiles enable row level security;

-- Un utilisateur ne voit que son propre profil
create policy "profiles_select" on profiles
  for select using (id = auth.uid());

-- ============================================================
-- FONCTION HELPER
-- Retourne le tenant_id de l'utilisateur connecté
-- ============================================================
create or replace function current_tenant_id()
returns uuid
language sql stable
as $$
  select tenant_id from profiles where id = auth.uid()
$$;

-- ============================================================
-- RLS — TENANTS
-- ============================================================
create policy "tenants_select" on tenants
  for select using (id = current_tenant_id());

-- ============================================================
-- RLS — SUPPLIERS
-- ============================================================
create policy "suppliers_select" on suppliers
  for select using (tenant_id = current_tenant_id());

create policy "suppliers_insert" on suppliers
  for insert with check (tenant_id = current_tenant_id());

create policy "suppliers_update" on suppliers
  for update using (tenant_id = current_tenant_id());

create policy "suppliers_delete" on suppliers
  for delete using (tenant_id = current_tenant_id());

-- ============================================================
-- RLS — PRICE_REFERENCES (accès via supplier)
-- ============================================================
create policy "price_references_select" on price_references
  for select using (
    supplier_id in (select id from suppliers where tenant_id = current_tenant_id())
  );

create policy "price_references_insert" on price_references
  for insert with check (
    supplier_id in (select id from suppliers where tenant_id = current_tenant_id())
  );

create policy "price_references_update" on price_references
  for update using (
    supplier_id in (select id from suppliers where tenant_id = current_tenant_id())
  );

create policy "price_references_delete" on price_references
  for delete using (
    supplier_id in (select id from suppliers where tenant_id = current_tenant_id())
  );

-- ============================================================
-- RLS — INVOICES
-- ============================================================
create policy "invoices_select" on invoices
  for select using (tenant_id = current_tenant_id());

create policy "invoices_insert" on invoices
  for insert with check (tenant_id = current_tenant_id());

create policy "invoices_update" on invoices
  for update using (tenant_id = current_tenant_id());

create policy "invoices_delete" on invoices
  for delete using (tenant_id = current_tenant_id());

-- ============================================================
-- RLS — INVOICE_LINES (accès via invoice)
-- ============================================================
create policy "invoice_lines_select" on invoice_lines
  for select using (
    invoice_id in (select id from invoices where tenant_id = current_tenant_id())
  );

create policy "invoice_lines_insert" on invoice_lines
  for insert with check (
    invoice_id in (select id from invoices where tenant_id = current_tenant_id())
  );

create policy "invoice_lines_update" on invoice_lines
  for update using (
    invoice_id in (select id from invoices where tenant_id = current_tenant_id())
  );

create policy "invoice_lines_delete" on invoice_lines
  for delete using (
    invoice_id in (select id from invoices where tenant_id = current_tenant_id())
  );

-- ============================================================
-- RLS — RECONCILIATION_ALERTS (lecture seule pour les users)
-- Les insertions sont faites par les Edge Functions (service_role)
-- ============================================================
create policy "alerts_select" on reconciliation_alerts
  for select using (
    invoice_line_id in (
      select il.id from invoice_lines il
      join invoices i on i.id = il.invoice_id
      where i.tenant_id = current_tenant_id()
    )
  );
