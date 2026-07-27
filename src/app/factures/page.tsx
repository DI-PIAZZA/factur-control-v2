import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import DeleteFactureButton from "./[id]/DeleteFactureButton";

const STATUS_CONFIG = {
  pending:  { label: "En cours",  bg: "#FFF7ED", color: "#EA580C", dot: "#F59E0B" },
  checked:  { label: "Contrôlée", bg: "#F0FDF4", color: "#16A34A", dot: "#16A34A" },
  error:    { label: "Erreur",    bg: "#FEF2F2", color: "#DC2626", dot: "#DC2626" },
} as const;

export default async function FacturesPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const { success } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: factures } = await supabase
    .from("invoices")
    .select("*, suppliers(name, nom_commercial)")
    .order("created_at", { ascending: false });

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar userEmail={user.email ?? ""} />

      <main style={{ flex: 1, background: "#F1F5F9", padding: "24px 32px" }}>
        {/* Retour accueil */}
        <div style={{ marginBottom: "20px" }}>
          <Link href="/dashboard" style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            color: "#1D4ED8", fontSize: "13px", fontWeight: "600",
            textDecoration: "none", background: "#EFF6FF",
            border: "1px solid #BFDBFE", padding: "6px 14px", borderRadius: "8px",
          }}>
            ← Accueil
          </Link>
        </div>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#1F2937", margin: 0 }}>Factures</h1>
          <div style={{ display: "flex", gap: "10px" }}>
            <Link
              href="/factures/import-lot"
              style={{
                background: "#1D4ED8", color: "white", padding: "10px 20px",
                borderRadius: "8px", fontSize: "14px", fontWeight: "600",
                textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px",
              }}
            >
              📦 Import en lot
            </Link>
            <Link
              href="/factures/nouvelle"
              style={{
                background: "#E85A00", color: "white", padding: "10px 20px",
                borderRadius: "8px", fontSize: "14px", fontWeight: "600",
                textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px",
              }}
            >
              + Contrôler une facture
            </Link>
          </div>
        </div>

        {/* Succès suppression */}
        {success === "supprime" && (
          <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: "8px", padding: "12px 16px", color: "#16A34A", fontSize: "14px", fontWeight: "600", marginBottom: "20px" }}>
            ✅ Facture supprimée avec succès
          </div>
        )}

        {/* Liste vide */}
        {(!factures || factures.length === 0) && (
          <div style={{ background: "white", borderRadius: "12px", padding: "64px 32px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📄</div>
            <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#1F2937", marginBottom: "8px" }}>Aucune facture</h2>
            <p style={{ fontSize: "14px", color: "#6B7280", marginBottom: "28px" }}>
              Importez votre première facture pour démarrer le contrôle automatique.
            </p>
            <Link href="/factures/nouvelle" style={{ background: "#E85A00", color: "white", padding: "12px 28px", borderRadius: "8px", fontSize: "14px", fontWeight: "600", textDecoration: "none" }}>
              Contrôler une facture
            </Link>
          </div>
        )}

        {/* Tableau */}
        {factures && factures.length > 0 && (
          <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                  {["Fournisseur", "N° Facture", "Date", "Total HT", "Statut", "Ajoutée le", ""].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: "11px", color: "#6B7280", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {factures.map((f, i) => {
                  const st = STATUS_CONFIG[f.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const sup = f.suppliers as any;
                  const supplierName = sup?.nom_commercial || sup?.name || "—";
                  return (
                    <tr key={f.id} style={{ borderBottom: i < factures.length - 1 ? "1px solid #F3F4F6" : undefined }}>
                      <td style={{ padding: "14px 16px", fontSize: "14px", fontWeight: "600", color: "#1F2937" }}>
                        {supplierName}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "13px", fontFamily: "monospace", color: "#374151" }}>
                        {f.invoice_number || "—"}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "13px", color: "#6B7280" }}>
                        {f.invoice_date ? new Date(f.invoice_date).toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "14px", fontWeight: "700", color: "#1F2937" }}>
                        {Number(f.total_ht).toFixed(2).replace(".", ",")} €
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: st.bg, color: st.color, fontSize: "12px", fontWeight: "600", padding: "4px 10px", borderRadius: "20px", minWidth: "90px", justifyContent: "center" }}>
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: st.dot, flexShrink: 0 }} />
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "13px", color: "#9CA3AF" }}>
                        {new Date(f.created_at).toLocaleDateString("fr-FR")}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <Link
                            href={`/factures/${f.id}`}
                            style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#EFF6FF", color: "#1D4ED8", textDecoration: "none", fontSize: "13px", fontWeight: "600", padding: "6px 12px", borderRadius: "6px", border: "1px solid #BFDBFE", whiteSpace: "nowrap" }}
                          >
                            📋 Voir la facture
                          </Link>
                          {f.status === "checked" && (
                            <Link
                              href={`/factures/${f.id}/resultat`}
                              style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#F0FDF4", color: "#16A34A", textDecoration: "none", fontSize: "13px", fontWeight: "600", padding: "6px 12px", borderRadius: "6px", border: "1px solid #86EFAC", whiteSpace: "nowrap" }}
                            >
                              📊 Résultat
                            </Link>
                          )}
                          <DeleteFactureButton invoiceId={f.id} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
