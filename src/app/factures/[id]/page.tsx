import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import DeleteFactureButton from "./DeleteFactureButton";
import ControlerButton from "./ControlerButton";
import { saveInvoicePriceColumnAndRedirectAction } from "@/app/fournisseurs/[id]/actions";

const LINE_TYPE_CONFIG = {
  article:        { label: "Article",  bg: "#F0FDF4", color: "#16A34A" },
  consigne:       { label: "Consigne", bg: "#EFF6FF", color: "#1D4ED8" },
  remise_globale: { label: "Remise",   bg: "#FFF7ED", color: "#E85A00" },
} as const;

export default async function FactureDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string; set_colonne?: string; supplier_id?: string }>;
}) {
  const { id } = await params;
  const { success, set_colonne, supplier_id } = await searchParams;
  const showColonneForm = set_colonne === "1" && !!supplier_id;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*, suppliers(name, nom_commercial, siret)")
    .eq("id", id)
    .single();

  if (error || !invoice) notFound();

  const { data: lines } = await supabase
    .from("invoice_lines")
    .select("*")
    .eq("invoice_id", id)
    .order("line_type", { ascending: true })
    .order("label", { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sup = invoice.suppliers as any;
  const supplierName = sup?.nom_commercial || sup?.name || "—";

  const articles = lines?.filter((l) => l.line_type === "article") ?? [];
  const autres   = lines?.filter((l) => l.line_type !== "article") ?? [];

  // URL signée pour le PDF (si disponible)
  let pdfSignedUrl: string | null = null;
  if (invoice.file_url) {
    const { data: signedData } = await supabase.storage
      .from("invoices")
      .createSignedUrl(invoice.file_url, 3600);
    pdfSignedUrl = signedData?.signedUrl ?? null;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar userEmail={user.email ?? ""} />

      <main style={{ flex: 1, background: "#F1F5F9", padding: "24px 32px" }}>
        <div>
          {/* Retour + Supprimer */}
          <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Link href="/factures" style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#1F2937", color: "white", textDecoration: "none", fontSize: "14px", fontWeight: "600", padding: "8px 16px", borderRadius: "8px" }}>
              ← Retour aux factures
            </Link>
            <DeleteFactureButton invoiceId={id} />
          </div>

          {/* Succès */}
          {success === "1" && (
            <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: "8px", padding: "12px 16px", color: "#16A34A", fontSize: "14px", fontWeight: "600", marginBottom: "20px" }}>
              ✅ Facture extraite avec succès — {lines?.length ?? 0} lignes importées
            </div>
          )}

          {/* Header facture */}
          <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
              <div>
                <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#1F2937", marginBottom: "4px" }}>
                  {supplierName}
                </h1>
                <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginTop: "8px" }}>
                  {invoice.invoice_number && (
                    <span style={{ fontSize: "13px", color: "#6B7280" }}>
                      N° <span style={{ fontFamily: "monospace", color: "#374151", fontWeight: "600" }}>{invoice.invoice_number}</span>
                    </span>
                  )}
                  {invoice.invoice_date && (
                    <span style={{ fontSize: "13px", color: "#6B7280" }}>
                      Date : <span style={{ color: "#374151" }}>{new Date(invoice.invoice_date).toLocaleDateString("fr-FR")}</span>
                    </span>
                  )}
                  <span style={{ fontSize: "13px", color: "#6B7280" }}>
                    SIRET : <span style={{ fontFamily: "monospace", color: "#374151" }}>{sup?.siret || "—"}</span>
                  </span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "13px", color: "#6B7280", marginBottom: "4px" }}>Total HT facturé</div>
                <div style={{ fontSize: "28px", fontWeight: "800", color: "#1F2937" }}>
                  {Number(invoice.total_ht).toFixed(2).replace(".", ",")} €
                </div>
                <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                  {pdfSignedUrl && (
                    <Link href={pdfSignedUrl} target="_blank" rel="noopener noreferrer" style={{
                      background: "#E85A00", color: "white", textDecoration: "none",
                      fontSize: "13px", fontWeight: "700", padding: "8px 16px", borderRadius: "8px",
                      display: "inline-flex", alignItems: "center", gap: "6px",
                    }}>
                      📄 Voir le PDF original
                    </Link>
                  )}
                  {invoice.status === "checked" ? (
                    <Link href={"/factures/" + id + "/resultat"} style={{
                      background: "#16A34A", color: "white", textDecoration: "none",
                      fontSize: "13px", fontWeight: "700", padding: "8px 16px", borderRadius: "8px",
                      display: "inline-flex", alignItems: "center", gap: "6px",
                    }}>
                      📊 Voir le résultat
                    </Link>
                  ) : null}
                  <ControlerButton invoiceId={id} />
                </div>
              </div>
            </div>
          </div>

          {/* Encart choix colonne de prix */}
          {showColonneForm && (
            <div style={{ background: "#FFF7ED", border: "2px solid #FDBA74", borderRadius: "12px", padding: "20px 24px", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                <span style={{ fontSize: "20px" }}>📊</span>
                <div>
                  <div style={{ fontSize: "15px", fontWeight: "700", color: "#92400E" }}>Définir la colonne de prix facturé</div>
                  <div style={{ fontSize: "13px", color: "#B45309", marginTop: "2px" }}>
                    Consultez le PDF ci-dessus pour identifier le nom exact de la colonne (ex: PU NET HT, Prix unitaire HT…)
                  </div>
                </div>
              </div>
              <form action={saveInvoicePriceColumnAndRedirectAction} style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <input type="hidden" name="supplier_id" value={supplier_id} />
                <input
                  type="text"
                  name="price_column"
                  placeholder="ex: PU NET HT"
                  required
                  style={{
                    border: "2px solid #FDBA74", borderRadius: "8px", padding: "8px 14px",
                    fontSize: "14px", fontWeight: "600", outline: "none", width: "240px",
                    background: "white", color: "#1F2937",
                  }}
                />
                <button
                  type="submit"
                  style={{
                    background: "#E85A00", color: "white", border: "none",
                    borderRadius: "8px", padding: "8px 20px",
                    fontSize: "14px", fontWeight: "700", cursor: "pointer",
                  }}
                >
                  ✅ Enregistrer
                </button>
                <Link
                  href="/fournisseurs"
                  style={{
                    background: "white", color: "#6B7280", border: "1px solid #E5E7EB",
                    borderRadius: "8px", padding: "8px 16px",
                    fontSize: "14px", fontWeight: "600", textDecoration: "none",
                  }}
                >
                  Annuler
                </Link>
              </form>
            </div>
          )}

          {/* Stats rapides */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
            {[
              { label: "Lignes articles", value: articles.length, color: "#16A34A", bg: "#F0FDF4" },
              { label: "Consignes / Remises", value: autres.length, color: "#1D4ED8", bg: "#EFF6FF" },
              { label: "Total lignes", value: lines?.length ?? 0, color: "#1F2937", bg: "white" },
            ].map((s) => (
              <div key={s.label} style={{ background: s.bg, borderRadius: "10px", padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: "28px", fontWeight: "800", color: s.color }}>{s.value}</div>
                <div style={{ fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tableau lignes */}
          <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#1F2937" }}>
                Lignes de facture
                <span style={{ marginLeft: "8px", background: "#EFF6FF", color: "#1D4ED8", fontSize: "12px", fontWeight: "700", padding: "2px 8px", borderRadius: "12px" }}>
                  {lines?.length ?? 0}
                </span>
              </h2>
              <span style={{ fontSize: "12px", color: "#9CA3AF" }}></span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F9FAFB" }}>
                    {["Type", "Réf. article", "Libellé", "Qté", "Prix unit. facturé", "Total HT", "Unité"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: "11px", color: "#6B7280", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid #E5E7EB", whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines?.map((l, i) => {
                    const lt = LINE_TYPE_CONFIG[l.line_type as keyof typeof LINE_TYPE_CONFIG] ?? LINE_TYPE_CONFIG.article;
                    return (
                      <tr key={l.id} style={{ borderBottom: i < (lines.length - 1) ? "1px solid #F3F4F6" : undefined }}>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ fontSize: "11px", fontWeight: "600", padding: "2px 8px", borderRadius: "4px", background: lt.bg, color: lt.color, whiteSpace: "nowrap" }}>
                            {lt.label}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: "12px", fontFamily: "monospace", color: "#374151" }}>
                          {l.ref_article || "—"}
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: "13px", color: "#1F2937", fontWeight: "500" }}>
                          {l.label}
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: "13px", color: "#374151", textAlign: "right" }}>
                          {Number(l.quantity).toFixed(0)}
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: "13px", fontWeight: "700", color: "#1F2937", textAlign: "right", whiteSpace: "nowrap" }}>
                          {Number(l.unit_price_invoiced).toFixed(4).replace(".", ",")} €
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: "13px", fontWeight: "700", color: Number(l.line_total) < 0 ? "#DC2626" : "#1F2937", textAlign: "right", whiteSpace: "nowrap" }}>
                          {Number(l.line_total).toFixed(2).replace(".", ",")} €
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: "13px", color: "#6B7280" }}>
                          {l.unit || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
