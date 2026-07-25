import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import DeleteFournisseurButton from "./DeleteFournisseurButton";
import SetColonneFactureButton from "./SetColonneFactureButton";

export default async function FournisseursPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const { success } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: suppliers, error } = await supabase
    .from("suppliers")
    .select("*")
    .order("created_at", { ascending: false });

  // Dernière facture par fournisseur
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, supplier_id")
    .order("created_at", { ascending: false });

  const latestInvoiceBySupplier: Record<string, string> = {};
  for (const inv of invoices ?? []) {
    if (!latestInvoiceBySupplier[inv.supplier_id]) {
      latestInvoiceBySupplier[inv.supplier_id] = inv.id;
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar userEmail={user.email ?? ""} />

      <main style={{ flex: 1, background: "#F1F5F9", padding: "32px" }}>
        {/* Retour accueil */}
        <div style={{ marginBottom: "20px" }}>
          <a href="/dashboard" style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            color: "#1D4ED8", fontSize: "13px", fontWeight: "600",
            textDecoration: "none", background: "#EFF6FF",
            border: "1px solid #BFDBFE", padding: "6px 14px", borderRadius: "8px",
          }}>
            ← Accueil
          </a>
        </div>

        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#1F2937" }}>
            Fournisseurs
          </h1>
          <a
            href="/fournisseurs/nouveau"
            style={{
              background: "#E85A00",
              color: "white",
              padding: "10px 20px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            + Ajouter un fournisseur
          </a>
        </div>

        {/* Succès colonne */}
        {success === "colonne" && (
          <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: "8px", padding: "12px 16px", color: "#16A34A", fontSize: "14px", fontWeight: "600", marginBottom: "20px" }}>
            ✅ Colonne de prix enregistrée
          </div>
        )}

        {/* Succès suppression */}
        {success === "supprime" && (
          <div style={{ background: "#FFF7ED", border: "1px solid #FDBA74", borderRadius: "8px", padding: "12px 16px", color: "#EA580C", fontSize: "14px", fontWeight: "600", marginBottom: "20px" }}>
            🗑️ Fournisseur supprimé
          </div>
        )}

        {/* Erreur BDD */}
        {error && (
          <div
            style={{
              background: "#FEF2F2",
              border: "1px solid #FCA5A5",
              borderRadius: "8px",
              padding: "16px",
              color: "#DC2626",
              fontSize: "14px",
              marginBottom: "16px",
            }}
          >
            ⚠️ Erreur base de données : {error.message}
            <br />
            <span style={{ fontSize: "13px", opacity: 0.8 }}>
              Avez-vous appliqué les migrations SQL dans le SQL Editor de Supabase ?
            </span>
          </div>
        )}

        {/* Liste vide */}
        {!error && (!suppliers || suppliers.length === 0) && (
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "64px 32px",
              textAlign: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🏢</div>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#1F2937",
                marginBottom: "8px",
              }}
            >
              Aucun fournisseur
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: "#6B7280",
                marginBottom: "28px",
                maxWidth: "360px",
                margin: "0 auto 28px",
              }}
            >
              Ajoutez votre premier fournisseur pour commencer à contrôler vos
              factures.
            </p>
            <a
              href="/fournisseurs/nouveau"
              style={{
                background: "#E85A00",
                color: "white",
                padding: "12px 28px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                textDecoration: "none",
              }}
            >
              Ajouter un fournisseur
            </a>
          </div>
        )}

        {/* Tableau */}
        {!error && suppliers && suppliers.length > 0 && (
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              overflow: "hidden",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #E5E7EB", background: "#F9FAFB" }}>
                  {["Fournisseur", "SIRET", "Mail factures", "Colonne tarif", "Colonne facture", "Ajouté le", ""].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: "12px 16px",
                          fontSize: "11px",
                          color: "#6B7280",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s, i) => (
                  <tr
                    key={s.id}
                    style={{
                      borderBottom:
                        i < suppliers.length - 1
                          ? "1px solid #F3F4F6"
                          : undefined,
                    }}
                  >
                    <td
                      style={{
                        padding: "14px 16px",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#1F2937",
                      }}
                    >
                      <a
                        href={`/fournisseurs/${s.id}`}
                        style={{ color: "#1D4ED8", textDecoration: "none", fontWeight: "600" }}
                      >
                        {s.name}
                      </a>
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        fontSize: "13px",
                        color: "#6B7280",
                        fontFamily: "monospace",
                      }}
                    >
                      {s.siret || "—"}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        fontSize: "13px",
                        color: s.email_facturation ? "#1F2937" : "#D1D5DB",
                      }}
                    >
                      {s.email_facturation || "—"}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        fontSize: "13px",
                        color: "#6B7280",
                      }}
                    >
                      {s.price_column || "—"}
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <SetColonneFactureButton
                        supplierId={s.id}
                        currentValue={s.invoice_price_column}
                        latestInvoiceId={latestInvoiceBySupplier[s.id] ?? null}
                      />
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        fontSize: "13px",
                        color: "#9CA3AF",
                      }}
                    >
                      {new Date(s.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                      <a
                        href={`/fournisseurs/${s.id}/nouveau-tarif`}
                        style={{
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "white",
                          textDecoration: "none",
                          padding: "5px 12px",
                          borderRadius: "6px",
                          background: "#E85A00",
                          marginRight: "8px",
                          display: "inline-block",
                        }}
                      >
                        + Tarif
                      </a>
                      <a
                        href={`/fournisseurs/${s.id}/modifier`}
                        style={{
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#6B7280",
                          textDecoration: "none",
                          padding: "5px 12px",
                          border: "1px solid #E5E7EB",
                          borderRadius: "6px",
                          background: "white",
                          display: "inline-block",
                          marginRight: "8px",
                        }}
                      >
                        ✏️ Modifier
                      </a>
                      <DeleteFournisseurButton supplierId={s.id} supplierName={s.name} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
