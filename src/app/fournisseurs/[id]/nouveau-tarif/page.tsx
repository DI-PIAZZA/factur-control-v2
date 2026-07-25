import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { addTarifAction } from "./actions";
import ExtractTarifForm from "./ExtractTarifForm";

export default async function NouveauTarifPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string; mode?: string }>;
}) {
  const { id } = await params;
  const { erreur, mode } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: supplier, error } = await supabase
    .from("suppliers")
    .select("id, name, price_column")
    .eq("id", id)
    .single();

  if (error || !supplier) notFound();

  const action = addTarifAction.bind(null, id);
  const showManual = mode === "manuel";

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar userEmail={user.email ?? ""} />

      <main style={{ flex: 1, background: "#F1F5F9", padding: "32px" }}>
        <div style={{ maxWidth: "680px" }}>
          {/* Fil d'Ariane */}
          <div style={{ marginBottom: "20px", fontSize: "14px", color: "#6B7280" }}>
            <Link href="/fournisseurs" style={{ color: "#6B7280", textDecoration: "none" }}>Fournisseurs</Link>
            {" › "}
            <Link href={`/fournisseurs/${id}`} style={{ color: "#6B7280", textDecoration: "none" }}>{supplier.name}</Link>
            {" › "}
            <span style={{ color: "#1F2937" }}>Ajouter un tarif</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <h1 style={{ fontSize: "20px", fontWeight: "800", color: "#1F2937", margin: 0 }}>
              Ajouter un tarif — {supplier.name}
            </h1>

            {/* Toggle IA / Manuel */}
            <div style={{ display: "flex", gap: "8px" }}>
              <Link
                href={`/fournisseurs/${id}/nouveau-tarif`}
                style={{
                  padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: "600",
                  textDecoration: "none",
                  background: !showManual ? "#1D4ED8" : "white",
                  color: !showManual ? "white" : "#6B7280",
                  border: !showManual ? "none" : "1px solid #E5E7EB",
                  display: "inline-block",
                }}
              >
                ✨ PDF par IA
              </Link>
              <Link
                href={`/fournisseurs/${id}/nouveau-tarif?mode=manuel`}
                style={{
                  padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: "600",
                  textDecoration: "none",
                  background: showManual ? "#1D4ED8" : "white",
                  color: showManual ? "white" : "#6B7280",
                  border: showManual ? "none" : "1px solid #E5E7EB",
                  display: "inline-block",
                }}
              >
                ✏️ Saisie manuelle
              </Link>
            </div>
          </div>

          {/* Mode IA — drag-and-drop */}
          {!showManual && (
            <ExtractTarifForm supplierId={id} supplierName={supplier.name} currentPriceColumn={supplier.price_column ?? null} />
          )}

          {/* Mode manuel */}
          {showManual && (
            <>
              {erreur && (
                <div style={{
                  background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: "8px",
                  padding: "12px 16px", color: "#DC2626", fontSize: "14px", marginBottom: "20px",
                }}>
                  ⚠️ {erreur === "champs_invalides" ? "Réf. article et prix unitaire sont obligatoires." : erreur}
                </div>
              )}

              <div style={{
                background: "white", borderRadius: "12px", padding: "28px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}>
                <form action={action} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div>
                    <label style={labelStyle}>Référence article *</label>
                    <p style={hintStyle}>Le code tel qu&apos;il apparaît sur les factures.</p>
                    <input name="ref_article" placeholder="Ex : CIMENT42-25KG" required style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Libellé</label>
                    <input name="label" placeholder="Ex : Ciment CEM II 42,5 sac 25kg" style={inputStyle} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div>
                      <label style={labelStyle}>Prix unitaire HT *</label>
                      <input name="unit_price" type="number" step="0.0001" min="0" placeholder="Ex : 8.9500" required style={{ ...inputStyle, fontFamily: "monospace" }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Unité</label>
                      <input name="unit" placeholder="Ex : sac" style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Valable depuis</label>
                    <input name="valid_from" type="date" defaultValue={new Date().toISOString().slice(0, 10)} style={inputStyle} />
                  </div>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <button type="submit" style={{
                      background: "#E85A00", color: "white", padding: "12px 28px",
                      borderRadius: "8px", fontSize: "14px", fontWeight: "700", border: "none", cursor: "pointer",
                    }}>
                      Enregistrer
                    </button>
                    <Link href={`/fournisseurs/${id}`} style={{
                      background: "#F3F4F6", color: "#6B7280", padding: "12px 24px",
                      borderRadius: "8px", fontSize: "14px", fontWeight: "600", textDecoration: "none",
                      display: "inline-flex", alignItems: "center",
                    }}>
                      Annuler
                    </Link>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: "13px", fontWeight: "700", color: "#374151", marginBottom: "4px" };
const hintStyle: React.CSSProperties = { fontSize: "12px", color: "#9CA3AF", margin: "0 0 8px" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 14px", border: "1px solid #D1D5DB", borderRadius: "8px", fontSize: "14px", color: "#1F2937", outline: "none", boxSizing: "border-box" };
