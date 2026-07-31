-- E-Facturation : table credentials + colonne authorization

-- 1. Ajouter colonne e_invoice_authorized à suppliers
ALTER TABLE suppliers
ADD COLUMN e_invoice_authorized BOOLEAN DEFAULT FALSE;

-- 2. Créer table e_invoice_credentials
CREATE TABLE e_invoice_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('chorus', 'storefact', 'factur-x')),
  oauth_token TEXT NOT NULL,
  oauth_refresh_token TEXT,
  oauth_token_expires_at TIMESTAMP WITH TIME ZONE,
  authorized_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, supplier_id, platform)
);

-- 3. RLS sur e_invoice_credentials
ALTER TABLE e_invoice_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see e_invoice_credentials for their tenant"
  ON e_invoice_credentials
  FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY "Users can only insert e_invoice_credentials for their tenant"
  ON e_invoice_credentials
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "Users can only update e_invoice_credentials for their tenant"
  ON e_invoice_credentials
  FOR UPDATE
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "Users can only delete e_invoice_credentials for their tenant"
  ON e_invoice_credentials
  FOR DELETE
  USING (tenant_id = current_tenant_id());
