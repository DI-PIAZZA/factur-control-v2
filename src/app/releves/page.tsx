import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default async function RelevesPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const { success } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: releves } = await supabase
    .from("releves")
    .select("*, suppliers(name, nom_commercial)")
    .order("created_at", { ascending: false });

  // Pour chaque relevé, récupérer les stats des lignes
  const releveIds = (releves ?? []).map((r) => r.id);
  const { data: allLines } = releveIds.length > 0
    ? await supabase
        .from("releve_lines")
        .select("releve_id, status")
        .in("releve_id", releveIds)
    : { data: [] };

  const statsByReleve: Record<string, { total: number; found: number }> = {};
  for (const line of allLines ?? []) {
    if (!statsByReleve[line.releve_id]) statsByReleve[line.releve_id] = { total: 0, found: 0 };
    statsByReleve[line.releve_id].total++;
    if (line.status === "found") statsByReleve[line.releve_id].found++;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar userEmail={user.email ?? ""} />

      <main style={{ flex: 1, background: "#F1F5F9", padding: "24px 32px" }}>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#1F2937", margin: 0 }}>
            Relevés de compte
          </h1>
          <a
            href="/releves/nouvelle"
            style={{
              background: "#E85A00", color: "white", padding: "10px 20px",
              borderRadius: "8px", fontSize: "14px", fontWeight: "600",
              textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px",
            }}
          >
            + Analyser un relevé
          </a>
        </div>

        {/* Succès suppression */}
        {success === "supprime" && (
          <div style={{ background: "#FFF7ED", border: "1px solid #FDBA74", borderRadius: "8px", padding: "12px 16px", color: "#EA580C", fontSize: "14px", fontWeight: "600", marginBottom: "20px" }}>
            🗑️ Relevé supprimé
          </div>
        )}

        {/* Liste vide */}
        {(!releves || releves.length === 0) && (
          <div style={{ background: "white", borderRadius: "12px", padding: "64px 32px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
            <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#1F2937", marginBottom: "8px" }}>
              Aucun relevé analysé
            </h2>
            <p style={{ fontSize: "14px", color: "#6B7280", marginBottom: "28px" }}>
              Uploadez un relevé fournisseur pour vérifier qu'il correspond à vos factures.
            </p>
            <a href="/releves/nouvelle" style={{ background: "#E85A00", color: "white", padding: "12px 28px", borderRadius: "8px", fontSize: "14px", fontWeight: "600", textDecoration: "none" }}>
              Analyser un relevé
            </a>
          </div>
        )}

        {/* Tableau */}
        {releves && releves.length > 0 && (
          <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                  {["Fournisseur", "Date analyse", "Factures", "Validées", "Manquantes", "Taux", ""].map((h) => (
                    <th key={h} style={{
                      textAlign: "left", padding: "12px 16px",
                      fontSize: "11px", color: "#6B7280", fontWeight: "700",
                      textTransform: "uppercase", letterSpacing: "0.05em",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {releves.map((r, i) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const sup = r.suppliers as any;
                  const supplierName = sup?.nom_commercial || sup?.name || "—";
                  const stats = statsByReleve[r.id] ?? { total: 0, found: 0 };
                  const missing = stats.total - stats.found;
                  const pct = stats.total > 0 ? Math.round((stats.found / stats.total) * 100) : 0;
                  const allOk = pct === 100;
                  const someOk = pct > 0;

                  return (
                    <tr key={r.id} style={{ borderBottom: i < releves.length - 1 ? "1px solid #F3F4F6" : undefined }}>
                      <td style={{ padding: "14px 16px", fontSize: "14px", fontWeight: "700", color: "#1F2937" }}>
                        {supplierName}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "13px", color: "#6B7280" }}>
                        {new Date(r.created_at).toLocaleDateString("fr-FR")}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "14px", fontWeight: "700", color: "#1F2937" }}>
                        {stats.total}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "14px", fontWeight: "700", color: "#16A34A" }}>
                        {stats.found}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "14px", fontWeight: "700", color: missing > 0 ? "#DC2626" : "#16A34A" }}>
                        {missing}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "80px", background: "#F3F4F6", borderRadius: "4px", height: "6px", overflow: "hidden" }}>
                            <div style={{
                              width: `${pct}%`, height: "100%",
                              background: allOk ? "#16A34A" : someOk ? "#F59E0B" : "#DC2626",
                            }} />
                          </div>
                          <span style={{
                            fontSize: "12px", fontWeight: "700",
                            color: allOk ? "#16A34A" : someOk ? "#F59E0B" : "#DC2626",
                          }}>
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <a
                          href={`/releves/${r.id}`}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: "6px",
                            background: "#EFF6FF", color: "#1D4ED8",
                            textDecoration: "none", fontSize: "13px", fontWeight: "600",
                            padding: "6px 12px", borderRadius: "6px", border: "1px solid #BFDBFE",
                            whiteSpace: "nowrap",
                          }}
                        >
                          📋 Voir le relevé
                        </a>
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
