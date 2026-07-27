import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import MailAvoirModal from "./MailAvoirModal";
import HorsTarifActions from "./HorsTarifActions";
import ValidateEcartClient from "./ValidateEcartClient";
import RetourImportButton from "./RetourImportButton";

export default async function ResultatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Facture + fournisseur (avec email)
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*, suppliers(name, nom_commercial, siret, email_contact)")
    .eq("id", id)
    .single();

  if (error || !invoice) notFound();

  // Alertes du rapprochement
  const { data: alerts } = await supabase
    .from("reconciliation_alerts")
    .select("*")
    .eq("invoice_id", id)
    .order("alert_type", { ascending: true })
    .order("label", { ascending: true });

  // Lignes articles de la facture
  const { data: invoiceLines } = await supabase
    .from("invoice_lines")
    .select("*")
    .eq("invoice_id", id)
    .eq("line_type", "article")
    .order("label", { ascending: true });

  // Relevés de factures (factures antérieures référencées)
  const { data: releves } = await supabase
    .from("invoice_references")
    .select("*")
    .eq("invoice_id", id)
    .order("referenced_invoice_date", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sup = invoice.suppliers as any;
  const supplierName = sup?.nom_commercial || sup?.name || "—";
  const supplierId = invoice.supplier_id as string;

  // URL signée PDF
  let pdfSignedUrl: string | null = null;
  if (invoice.file_url) {
    const { data: signedData } = await supabase.storage
      .from("invoices")
      .createSignedUrl(invoice.file_url, 3600);
    pdfSignedUrl = signedData?.signedUrl ?? null;
  }

  // Index des alertes par invoice_line_id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const alertByLine = new Map<string, Record<string, any>>();
  for (const a of alerts ?? []) {
    if (a.invoice_line_id) alertByLine.set(a.invoice_line_id, a);
  }

  const ECART_TYPES = ["price_mismatch", "remise_non_appliquee"];

  const nbEcarts    = (alerts ?? []).filter((a) => ECART_TYPES.includes(a.alert_type)).length;
  const nbHorsTarif = (alerts ?? []).filter((a) => a.alert_type === "not_in_tarif").length;
  const nbConformes = (invoiceLines?.length ?? 0) - nbEcarts - nbHorsTarif;
  const totalEcart  = (alerts ?? [])
    .filter((a) => ECART_TYPES.includes(a.alert_type))
    .reduce((sum, a) => sum + (Number(a.delta) || 0), 0);

  // Lignes pour le mail avoir
  const mismatchLines = (invoiceLines ?? [])
    .filter((line) => ECART_TYPES.includes(alertByLine.get(line.id)?.alert_type ?? ""))
    .map((line) => {
      const alert = alertByLine.get(line.id)!;
      return {
        refArticle: line.ref_article as string | null,
        label: line.label as string,
        quantity: Number(line.quantity) || 1,
        unitPriceFact: Number(line.unit_price_invoiced ?? line.unit_price) || 0,
        unitPriceRef: Number(alert.unit_price_reference) || 0,
        delta: Number(alert.delta) || 0,
      };
    });

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar userEmail={user.email ?? ""} />

      <main style={{ flex: 1, background: "#F1F5F9", padding: "24px 32px" }}>

        {/* Retour */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
          <RetourImportButton />
          <Link href={"/factures/" + id} style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "#1F2937", color: "white", textDecoration: "none",
            fontSize: "14px", fontWeight: "600", padding: "8px 16px", borderRadius: "8px",
          }}>
            📄 Voir la facture
          </Link>
        </div>

        {/* Header */}
        <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <div style={{ fontSize: "12px", color: "#6B7280", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                Résultat du contrôle
              </div>
              <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#1F2937", margin: 0 }}>
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
              </div>
            </div>
            <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "12px" }}>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                {pdfSignedUrl && (
                  <Link href={pdfSignedUrl} target="_blank" rel="noopener noreferrer" style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    background: "#E85A00", color: "white", textDecoration: "none",
                    fontSize: "13px", fontWeight: "600", padding: "8px 14px", borderRadius: "8px",
                  }}>
                    📄 Voir le PDF original
                  </Link>
                )}
                <Link href={"/factures/" + id} style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  background: "#EFF6FF", color: "#1D4ED8", textDecoration: "none",
                  fontSize: "13px", fontWeight: "600", padding: "8px 14px", borderRadius: "8px",
                  border: "1px solid #BFDBFE",
                }}>
                  📋 Voir la facture initiale
                </Link>
              </div>
              {nbEcarts === 0 && nbHorsTarif === 0 ? (
                <span style={{ background: "#F0FDF4", color: "#16A34A", fontSize: "15px", fontWeight: "700", padding: "8px 20px", borderRadius: "24px", border: "1px solid #86EFAC" }}>
                  ✅ Facture conforme
                </span>
              ) : (
                <div>
                  <div style={{ fontSize: "13px", color: "#DC2626", fontWeight: "600", marginBottom: "4px" }}>
                    Sur-facturation totale
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: "800", color: "#DC2626" }}>
                    + {totalEcart.toFixed(2).replace(".", ",")} €
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
          {[
            { label: "Conformes", value: nbConformes, color: "#16A34A", bg: "#F0FDF4", border: "#86EFAC", icon: "✅" },
            { label: "Écarts de prix", value: nbEcarts, color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", icon: "🔴" },
            { label: "Hors tarif", value: nbHorsTarif, color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", icon: "🟣" },
          ].map((s) => (
            <div key={s.label} style={{
              background: s.bg, borderRadius: "10px", padding: "16px 20px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: `1px solid ${s.border}`,
            }}>
              <div style={{ fontSize: "32px", fontWeight: "900", color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "13px", color: "#6B7280", marginTop: "4px" }}>{s.icon} {s.label}</div>
            </div>
          ))}
        </div>

        {/* Tableau résultats */}
        <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#1F2937" }}>
              Détail ligne par ligne
              <span style={{ marginLeft: "8px", background: "#EFF6FF", color: "#1D4ED8", fontSize: "12px", fontWeight: "700", padding: "2px 8px", borderRadius: "12px" }}>
                {invoiceLines?.length ?? 0} articles
              </span>
            </h2>
            {nbEcarts > 0 && (
              <MailAvoirModal
                lines={mismatchLines}
                supplierName={supplierName}
                supplierEmail={(invoice.suppliers as any)?.email_contact ?? null}
                userEmail={user.email ?? ""}
                invoiceNumber={invoice.invoice_number ?? null}
                invoiceDate={invoice.invoice_date ?? null}
                totalEcart={totalEcart}
              />
            )}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F9FAFB" }}>
                  {[
                    { label: "Réf. article", align: "left" },
                    { label: "Libellé", align: "left" },
                    { label: "Qté", align: "right" },
                    { label: "Prix facturé", align: "right" },
                    { label: "Prix tarif", align: "right" },
                    { label: "Écart", align: "right" },
                    { label: "Statut", align: "left" },
                    { label: "Actions", align: "left" },
                  ].map((h) => (
                    <th key={h.label} style={{
                      textAlign: h.align as "left" | "right",
                      padding: "10px 12px", fontSize: "11px", color: "#6B7280",
                      fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.04em",
                      borderBottom: "1px solid #E5E7EB", whiteSpace: "nowrap",
                    }}>
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoiceLines?.map((line, i) => {
                  const alert = alertByLine.get(line.id) ?? null;
                  const isHorsTarif = alert?.alert_type === "not_in_tarif";
                  const isEcart = ECART_TYPES.includes(alert?.alert_type ?? "");
                  const isRemiseNA = alert?.alert_type === "remise_non_appliquee";
                  const isConforme = !alert;

                  const rowBg = isHorsTarif
                    ? "#FAF5FF"
                    : isEcart
                    ? "#FEF2F2"
                    : i % 2 === 1 ? "#F9FAFB" : "white";

                  const statusBadge = isHorsTarif
                    ? { label: "Hors tarif", bg: "#EDE9FE", color: "#7C3AED", border: "#C4B5FD" }
                    : isRemiseNA
                    ? { label: "Remise non déduite", bg: "#FEF9C3", color: "#B45309", border: "#FDE68A" }
                    : isEcart
                    ? { label: "Écart prix", bg: "#FEE2E2", color: "#DC2626", border: "#FECACA" }
                    : { label: "Conforme", bg: "#DCFCE7", color: "#16A34A", border: "#86EFAC" };

                  const delta = Number(alert?.delta) || 0;
                  const refPrice = alert ? (Number(alert.unit_price_reference) || null) : null;
                  const invoicedPrice = Number(line.unit_price_invoiced ?? line.unit_price) || 0;
                  const qty = Number(line.quantity) || 1;

                  return (
                    <tr key={line.id} style={{ background: rowBg, borderBottom: i < (invoiceLines.length - 1) ? "1px solid #F3F4F6" : undefined }}>
                      <td style={{ padding: "10px 12px", fontSize: "12px", fontFamily: "monospace", color: "#374151", whiteSpace: "nowrap" }}>
                        {line.ref_article || "—"}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "13px", color: "#1F2937", fontWeight: "500", maxWidth: "280px" }}>
                        {line.label}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "13px", color: "#6B7280", textAlign: "right", whiteSpace: "nowrap" }}>
                        {qty}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "13px", fontWeight: "700", color: "#1F2937", textAlign: "right", whiteSpace: "nowrap" }}>
                        {invoicedPrice.toFixed(4).replace(".", ",")} €
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "13px", color: refPrice !== null ? "#16A34A" : "#9CA3AF", textAlign: "right", whiteSpace: "nowrap" }}>
                        {refPrice !== null ? refPrice.toFixed(4).replace(".", ",") + " €" : "—"}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "13px", fontWeight: "700", color: isEcart ? "#DC2626" : "#9CA3AF", textAlign: "right", whiteSpace: "nowrap" }}>
                        {isEcart ? `+ ${delta.toFixed(4).replace(".", ",")} €` : "—"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{
                          display: "inline-block",
                          fontSize: "11px", fontWeight: "700", padding: "3px 10px",
                          borderRadius: "20px",
                          background: statusBadge.bg,
                          color: statusBadge.color,
                          border: `1px solid ${statusBadge.border}`,
                          whiteSpace: "nowrap",
                        }}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {isEcart && (
                          <ValidateEcartClient
                            alertId={alert!.id}
                            lineId={line.id}
                            invoiceId={id}
                            supplierId={supplierId}
                            refArticle={line.ref_article ?? null}
                            label={line.label ?? ""}
                            unitPrice={refPrice ?? invoicedPrice}
                            invoicedPrice={invoicedPrice}
                          />
                        )}
                        {isHorsTarif && (
                          <HorsTarifActions
                            alertId={alert!.id}
                            invoiceId={id}
                            supplierId={supplierId}
                            refArticle={line.ref_article ?? null}
                            label={line.label ?? ""}
                            unitPrice={invoicedPrice}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Relevés de factures */}
          {releves && releves.length > 0 && (
            <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflow: "hidden", marginBottom: "20px", marginTop: "20px" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#1F2937" }}>
                  📋 Relevé de factures
                </h2>
                <span style={{ background: "#E2E8F0", color: "#475569", fontSize: "12px", fontWeight: "700", padding: "2px 8px", borderRadius: "12px" }}>
                  {releves.length} facture{releves.length > 1 ? "s" : ""} (non contrôlées)
                </span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F9FAFB" }}>
                      {["N° Facture", "Date", "Montant HT", "Montant TTC"].map((h) => (
                        <th key={h} style={{
                          textAlign: "left", padding: "10px 14px",
                          fontSize: "11px", color: "#6B7280", fontWeight: "700",
                          textTransform: "uppercase", letterSpacing: "0.04em",
                          borderBottom: "1px solid #E5E7EB", whiteSpace: "nowrap",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {releves.map((r, i) => (
                      <tr key={r.id} style={{ background: i % 2 === 1 ? "#F9FAFB" : "white", borderBottom: "1px solid #F3F4F6" }}>
                        <td style={{ padding: "10px 14px", fontSize: "12px", fontFamily: "monospace", color: "#374151", fontWeight: "600" }}>
                          {r.referenced_invoice_number || "—"}
                        </td>
                        <td style={{ padding: "10px 14px", fontSize: "12px", color: "#6B7280", whiteSpace: "nowrap" }}>
                          {r.referenced_invoice_date ? new Date(r.referenced_invoice_date).toLocaleDateString("fr-FR") : "—"}
                        </td>
                        <td style={{ padding: "10px 14px", fontSize: "13px", fontWeight: "700", color: "#1F2937", textAlign: "right", whiteSpace: "nowrap" }}>
                          {r.referenced_amount_ht != null ? r.referenced_amount_ht.toFixed(2).replace(".", ",") + " €" : "—"}
                        </td>
                        <td style={{ padding: "10px 14px", fontSize: "13px", fontWeight: "700", color: "#1F2937", textAlign: "right", whiteSpace: "nowrap" }}>
                          {r.referenced_amount_ttc != null ? r.referenced_amount_ttc.toFixed(2).replace(".", ",") + " €" : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Total écarts */}
          {nbEcarts > 0 && (
            <div style={{
              padding: "16px 24px", borderTop: "2px solid #FEE2E2",
              background: "#FEF2F2", display: "flex",
              justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontSize: "14px", color: "#374151", fontWeight: "600" }}>
                Total sur-facturation ({nbEcarts} ligne{nbEcarts > 1 ? "s" : ""})
              </span>
              <span style={{ fontSize: "24px", fontWeight: "900", color: "#DC2626" }}>
                + {totalEcart.toFixed(2).replace(".", ",")} €
              </span>
            </div>
          )}

          {/* Vide */}
          {(!invoiceLines || invoiceLines.length === 0) && (
            <div style={{ padding: "48px", textAlign: "center", color: "#9CA3AF", fontSize: "14px" }}>
              Aucune ligne article trouvée. Vérifiez que la facture a bien été contrôlée.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
