import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import UploadReleveForm from "./UploadReleveForm";

export default async function NouvelleRelevePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("id, name, nom_commercial")
    .order("name");

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar userEmail={user.email ?? ""} />

      <main style={{ flex: 1, background: "#F1F5F9", padding: "24px 32px" }}>
        {/* Retour */}
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

        <div style={{ maxWidth: "560px", margin: "0 auto" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>📋</div>
            <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#1F2937", margin: "0 0 8px" }}>
              Contrôle relevé de compte
            </h1>
            <p style={{ fontSize: "14px", color: "#6B7280", margin: 0 }}>
              Vérifiez que toutes les factures du relevé fournisseur sont bien présentes dans votre historique.
            </p>
          </div>

          {/* Formulaire */}
          <div style={{
            background: "white", borderRadius: "16px",
            padding: "32px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}>
            {(!suppliers || suppliers.length === 0) ? (
              <div style={{ textAlign: "center", color: "#6B7280", fontSize: "14px" }}>
                <p>Aucun fournisseur trouvé.</p>
                <a href="/fournisseurs/nouveau" style={{ color: "#E85A00", fontWeight: "600" }}>
                  Ajouter un fournisseur →
                </a>
              </div>
            ) : (
              <UploadReleveForm suppliers={suppliers} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
