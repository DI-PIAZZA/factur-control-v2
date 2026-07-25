import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import DeleteReleveButton from "./DeleteReleveButton";

export default async function ReleveResultatPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string }>;
}) {
  const { id } = await params;
  const { success } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: releve, error } = await supabase
    .from("releves")
    .select("*, suppliers(name, nom_commercial)")
    .eq("id", id)
    .single();

  if (error || !releve) notFound();

  const { data: lines } = await supabase
    .from("releve_lines")
    .select("*")
    .eq("releve_id", id)
    .order("created_at", { ascending: true });

  // Récupérer le statut des factures liées
  const matchedIds = (lines ?? [])
    .filter((l) => l.matched_invoice_id)
    .map((l) => l.matched_invoice_id as string);

  const invoiceStatusMap: Record<string, string> = {};
  if (matchedIds.length > 0) {
    const { data: matchedInvoices } = await supabase
      .from("invoices")
      .select("id, status")
      .in("id", matchedIds);
    for (const inv of matchedInvoices ?? []) {
      invoiceStatusMap[inv.id] = inv.status;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sup = releve.suppliers as any;
  const supplierName = sup?.nom_commercial || sup?.name || "—";

  const found   = lines?.filter((l) => l.status === "found") ?? [];
  const missing = lines?.filter((l) => l.status === "missing") ?? [];
  const total   = lines?.length ?? 0;
  const pctOk   = total > 0 ? Math.round((found.length / total) * 100) : 0;

  // URL signée PDF
  let pdfSignedUrl: string | null = null;
  if (releve.file_url) {
    const { data: signed } = await supabase.storage
      .from("invoices")
      .createSignedUrl(releve.file_url, 3600);
    pdfSignedUrl = signed?.signedUrl ?? null;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar userEmail={user.email ?? ""} />

      <main style={{ flex: 1, background: "#F1F5F9", padding: "24px 32px" }}>
        {/* Retour */}
        <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/dashboard" style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            color: "#1D4ED8", fontSize: "13px", fontWeight: "600",
            textDecoration: "none", background: "#EFF6FF",
            border: "1px solid #BFDBFE", padding: "6px 14px", borderRadius: "8px",
          }}>
            ← Accueil
          </a>
          <DeleteReleveButton releveId={id} />
          {pdfSignedUrl && (
            <a href={pdfSignedUrl} target="_blank" rel="noopener noreferrer" style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              background: "#E85A00", color: "white", textDecoration: "none",
              fontSize: "13px", fontWeight: "700", padding: "8px 16px", borderRadius: "8px",
            }}>
              📄 Voir le relevé PDF
            </a>
          )}
        </div>

        {/* Succès import */}
        {success === "importe" && (
          <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: "8px", padding: "12px 16px", color: "#16A34A", fontSize: "14px", fontWeight: "600", marginBottom: "20px" }}>
            ✅ Facture importée et contrôlée — le relevé a été mis à jour
          </div>
        )}

        {/* Header */}
        <div style={{ background: "white", borderRadius: "12px", padding: "24px", marginBottom: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#1F2937", margin: "0 0 6px" }}>
                Relevé — {supplierName}
              </h1>
              <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>
                Analysé le {new Date(releve.created_at).toLocaleDateString("fr-FR")}
              </p>
            </div>
            {/* Jauge */}
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontSize: "36px", fontWeight: "900",
                color: pctOk === 100 ? "#16A34A" : pctOk >= 50 ? "#F59E0B" : "#DC2626",
              }}>
                {pctOk}%
              </div>
              <div style={{ fontSize: "12px", color: "#6B7280", fontWeight: "600" }}>validé</div>
            </div>
          </div>

          {/* Barre de progression */}
          <div style={{ marginTop: "20px", background: "#F3F4F6", borderRadius: "8px", height: "10px", overflow: "hidden" }}>
            <div style={{
              width: `${pctOk}%`, height: "100%",
              background: pctOk === 100 ? "#16A34A" : pctOk >= 50 ? "#F59E0B" : "#DC2626",
              transition: "width 0.5s",
            }} />
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
          {[
            { label: "Factures dans le relevé", value: total, color: "#1F2937", bg: "white" },
            { label: "✅ Validées", value: found.length, color: "#16A34A", bg: "#F0FDF4" },
            { label: "🔴 Manquantes", value: missing.length, color: "#DC2626", bg: "#FEF2F2" },
          ].map((s) => (
            <div key={s.label} style={{ background: s.bg, borderRadius: "10px", padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: "28px", fontWeight: "800", color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tableau */}
        <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #F3F4F6" }}>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#1F2937" }}>
              Détail ligne par ligne
            </h2>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F9FAFB" }}>
                {["N° Facture", "Montant HT", "Statut", "Contrôle tarif", "Lien facture"].map((h) => (
                  <th key={h} style={{
                    textAlign: "left", padding: "10px 16px",
                    fontSize: "11px", color: "#6B7280", fontWeight: "700",
                    textTransform: "uppercase", letterSpacing: "0.04em",
                    borderBottom: "1px solid #E5E7EB",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines?.map((l, i) => (
                <tr key={l.id} style={{ borderBottom: i < (lines.length - 1) ? "1px solid #F3F4F6" : undefined }}>
                  <td style={{ padding: "12px 16px", fontSize: "14px", fontFamily: "monospace", fontWeight: "600", color: "#1F2937" }}>
                    {l.invoice_number || "—"}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: "700", color: "#1F2937" }}>
                    {Number(l.amount_ht).toFixed(2).replace(".", ",")} €
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {l.status === "found" ? (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: "6px",
                        background: "#F0FDF4", color: "#16A34A",
                        fontSize: "12px", fontWeight: "700",
                        padding: "4px 12px", borderRadius: "20px",
                        border: "1px solid #86EFAC",
                      }}>
                        ✅ Validée
                      </span>
                    ) : (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: "6px",
                        background: "#FEF2F2", color: "#DC2626",
                        fontSize: "12px", fontWeight: "700",
                        padding: "4px 12px", borderRadius: "20px",
                        border: "1px solid #FECACA",
                      }}>
                        🔴 Manquante
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {l.status === "found" && l.matched_invoice_id ? (() => {
                      const invStatus = invoiceStatusMap[l.matched_invoice_id];
                      if (invStatus === "checked") {
                        return (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: "6px",
                            background: "#F0FDF4", color: "#16A34A",
                            fontSize: "12px", fontWeight: "700",
                            padding: "4px 12px", borderRadius: "20px",
                            border: "1px solid #86EFAC",
                          }}>
                            ✅ Contrôlée
                          </span>
                        );
                      }
                      return (
                        <a href={`/factures/${l.matched_invoice_id}`} style={{
                          display: "inline-flex", alignItems: "center", gap: "6px",
                          background: "#FFF7ED", color: "#EA580C",
                          fontSize: "12px", fontWeight: "700",
                          padding: "4px 12px", borderRadius: "20px",
                          border: "1px solid #FDBA74",
                          textDecoration: "none", cursor: "pointer",
                        }}>
                          ⚠️ Non contrôlée →
                        </a>
                      );
                    })() : (
                      <span style={{ fontSize: "12px", color: "#D1D5DB" }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {l.matched_invoice_id ? (
                      <a
                        href={`/factures/${l.matched_invoice_id}`}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "4px",
                          color: "#1D4ED8", fontSize: "13px", fontWeight: "600",
                          textDecoration: "none", background: "#EFF6FF",
                          padding: "4px 10px", borderRadius: "6px",
                          border: "1px solid #BFDBFE",
                        }}
                      >
                        📋 Voir
                      </a>
                    ) : (
                      <a
                        href={`/factures/nouvelle?supplier_id=${releve.supplier_id}&releve_id=${id}&invoice_number=${encodeURIComponent(l.invoice_number ?? "")}&amount_ht=${l.amount_ht ?? 0}`}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "4px",
                          color: "#DC2626", fontSize: "13px", fontWeight: "600",
                          textDecoration: "none", background: "#FEF2F2",
                          padding: "4px 10px", borderRadius: "6px",
                          border: "1px solid #FECACA",
                        }}
                      >
                        + Importer
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
