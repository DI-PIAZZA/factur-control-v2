-- Migration 010 : table des alertes de rapprochement

create table if not exists reconciliation_alerts (
  id                   uuid primary key default gen_random_uuid(),
  invoice_id           uuid not null references invoices(id) on delete cascade,
  invoice_line_id      uuid references invoice_lines(id) on delete set null,
  supplier_id          uuid not null references suppliers(id) on delete cascade,
  tenant_id            uuid not null references tenants(id) on delete cascade,
  ref_article          text,
  label                text,
  unit_price_invoiced  numeric(10,4) not null default 0,
  unit_price_reference numeric(10,4),
  delta                numeric(10,4),
  alert_type           text not null check (alert_type in ('price_mismatch', 'not_in_tarif')),
  created_at           timestamptz not null default now()
);

create index if not exists idx_alerts_invoice  on reconciliation_alerts(invoice_id);
create index if not exists idx_alerts_tenant   on reconciliation_alerts(tenant_id);

alter table reconciliation_alerts enable row level security;

create policy "tenant_alerts" on reconciliation_alerts
  using (tenant_id = current_tenant_id());

grant select, insert, update, delete on reconciliation_alerts to anon, authenticated;
