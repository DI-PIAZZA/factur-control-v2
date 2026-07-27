import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import NouvelleFactureForm from "./NouvelleFactureForm";

export default async function NouvelleFacturePage({
  searchParams,
}: {
  searchParams: Promise<{ supplier_id?: string; releve_id?: string; invoice_number?: string; amount_ht?: string }>;
}) {
  const { supplier_id, releve_id, invoice_number, amount_ht } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("id, name, nom_commercial, invoice_price_column")
    .order("name", { ascending: true });

  if (!suppliers || suppliers.length === 0) {
    redirect("/fournisseurs?error=no_supplier");
  }

  const retourHref = releve_id ? `/releves/${releve_id}` : "/factures";
  const retourLabel = releve_id ? "← Retour au relevé" : "← Retour aux factures";

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar userEmail={user.email ?? ""} />

      <main style={{ flex: 1, background: "#F1F5F9", padding: "24px 32px" }}>
        <div style={{ maxWidth: "680px" }}>
          {/* Retour */}
          <div style={{ marginBottom: "20px" }}>
            <Link href={retourHref} style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#1F2937", color: "white", textDecoration: "none", fontSize: "14px", fontWeight: "600", padding: "8px 16px", borderRadius: "8px" }}>
              {retourLabel}
            </Link>
          </div>

          {/* Bandeau relevé avec rappel de la facture */}
          {releve_id && (
            <div style={{ background: "#EFF6FF", border: "2px solid #BFDBFE", borderRadius: "12px", padding: "16px 20px", marginBottom: "16px" }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#1D4ED8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
                📋 Facture à importer depuis le relevé
              </div>
              <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
                {invoice_number && (
                  <div>
                    <div style={{ fontSize: "11px", color: "#6B7280", marginBottom: "2px" }}>N° Facture</div>
                    <div style={{ fontSize: "18px", fontWeight: "900", color: "#1E40AF", fontFamily: "monospace" }}>{invoice_number}</div>
                  </div>
                )}
                {amount_ht && (
                  <div>
                    <div style={{ fontSize: "11px", color: "#6B7280", marginBottom: "2px" }}>Montant HT</div>
                    <div style={{ fontSize: "18px", fontWeight: "900", color: "#1E40AF" }}>
                      {Number(amount_ht).toFixed(2).replace(".", ",")} €
                    </div>
                  </div>
                )}
              </div>
              <div style={{ marginTop: "10px", fontSize: "12px", color: "#3B82F6" }}>
                ↩ Vous reviendrez automatiquement au relevé après le contrôle
              </div>
            </div>
          )}

          {/* Titre */}
          <div style={{ background: "white", borderRadius: "12px", padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: "20px" }}>
            <h1 style={{ fontSize: "20px", fontWeight: "800", color: "#1F2937", margin: "0 0 4px" }}>
              Contrôler une facture
            </h1>
            <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>
              Déposez la facture PDF — Claude extrait automatiquement toutes les lignes.
            </p>
          </div>

          <NouvelleFactureForm
            suppliers={suppliers}
            initialSupplierId={supplier_id ?? null}
            releveId={releve_id ?? null}
          />
        </div>
      </main>
    </div>
  );
}
