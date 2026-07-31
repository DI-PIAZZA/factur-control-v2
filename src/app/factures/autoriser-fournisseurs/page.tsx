import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import AutoriseFournisseurButton from "./AutoriseFournisseurButton";

export default async function AutoriseFournisseursPage({
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

  // Récupérer les fournisseurs avec leurs status e-invoice
  const { data: suppliers, error } = await supabase
    .from("suppliers")
    .select(`
      id,
      name,
      siret,
      e_invoice_authorized,
      created_at
    `)
    .order("created_at", { ascending: false });

  // Récupérer les credentials e-invoice
  const { data: credentials } = await supabase
    .from("e_invoice_credentials")
    .select("supplier_id, platform")
    .in("supplier_id", suppliers?.map((s) => s.id) ?? []);

  const credentialsBySupplier: Record<string, string[]> = {};
  for (const cred of credentials ?? []) {
    if (!credentialsBySupplier[cred.supplier_id]) {
      credentialsBySupplier[cred.supplier_id] = [];
    }
    credentialsBySupplier[cred.supplier_id].push(cred.platform);
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar userEmail={user.email ?? ""} />

      <main style={{ flex: 1, background: "#F1F5F9", padding: "32px" }}>
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
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#1F2937", marginBottom: "8px" }}>
            Autoriser la récupération de factures
          </h1>
          <p style={{ fontSize: "14px", color: "#6B7280" }}>
            Autorisez chaque fournisseur pour que nous récupérions automatiquement ses factures d'achat via la facturation électronique.
          </p>
        </div>

        {/* Erreur BDD */}
        {error && (
          <div style={{
            background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: "8px",
            padding: "16px", color: "#DC2626", fontSize: "14px", marginBottom: "16px",
          }}>
            ⚠️ Erreur base de données : {error.message}
          </div>
        )}

        {/* Succès */}
        {success === "authorized" && (
          <div style={{
            background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: "8px",
            padding: "12px 16px", color: "#16A34A", fontSize: "14px", fontWeight: "600",
            marginBottom: "20px"
          }}>
            ✅ Fournisseur autorisé !
          </div>
        )}

        {/* Liste vide */}
        {!error && (!suppliers || suppliers.length === 0) && (
          <div style={{
            background: "white", borderRadius: "12px", padding: "64px 32px",
            textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🏢</div>
            <h2 style={{
              fontSize: "18px", fontWeight: "600",
              color: "#1F2937", marginBottom: "8px",
            }}>
              Aucun fournisseur
            </h2>
            <p style={{
              fontSize: "14px", color: "#6B7280", marginBottom: "28px",
              maxWidth: "360px", margin: "0 auto 28px",
            }}>
              Vous devez d'abord ajouter des fournisseurs.
            </p>
            <Link href="/fournisseurs" style={{
              background: "#E85A00", color: "white", padding: "12px 28px",
              borderRadius: "8px", fontSize: "14px", fontWeight: "600",
              textDecoration: "none",
            }}>
              Aller à mes fournisseurs
            </Link>
          </div>
        )}

        {/* Tableau */}
        {!error && suppliers && suppliers.length > 0 && (
          <div style={{
            background: "white", borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflow: "hidden",
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #E5E7EB", background: "#F9FAFB" }}>
                  {["Fournisseur", "SIRET", "Statut", ""].map((h) => (
                    <th key={h} style={{
                      textAlign: "left", padding: "12px 16px", fontSize: "11px",
                      color: "#6B7280", fontWeight: "700",
                      textTransform: "uppercase", letterSpacing: "0.05em",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s, i) => {
                  const platforms = credentialsBySupplier[s.id] ?? [];
                  const isAuthorized = s.e_invoice_authorized && platforms.length > 0;

                  return (
                    <tr key={s.id} style={{
                      borderBottom: i < suppliers.length - 1
                        ? "1px solid #F3F4F6" : undefined,
                    }}>
                      <td style={{
                        padding: "14px 16px", fontSize: "14px",
                        fontWeight: "600", color: "#1F2937",
                      }}>
                        {s.name}
                      </td>
                      <td style={{
                        padding: "14px 16px", fontSize: "13px",
                        color: "#6B7280", fontFamily: "monospace",
                      }}>
                        {s.siret || "—"}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        {isAuthorized ? (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: "6px",
                            background: "#F0FDF4", color: "#16A34A",
                            fontSize: "12px", fontWeight: "600",
                            padding: "4px 10px", borderRadius: "20px",
                            minWidth: "120px", justifyContent: "center",
                          }}>
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#16A34A" }} />
                            Autorisé
                          </span>
                        ) : (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: "6px",
                            background: "#FEF2F2", color: "#DC2626",
                            fontSize: "12px", fontWeight: "600",
                            padding: "4px 10px", borderRadius: "20px",
                            minWidth: "120px", justifyContent: "center",
                          }}>
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#DC2626" }} />
                            Non autorisé
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <AutoriseFournisseurButton
                          supplierId={s.id}
                          isAuthorized={isAuthorized}
                          platforms={platforms}
                        />
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
