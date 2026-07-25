import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ImportLotForm from "./ImportLotForm";

export default async function ImportLotPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar userEmail={user.email ?? ""} />

      <main style={{ flex: 1, background: "#F1F5F9", padding: "24px 32px" }}>

        {/* Retour */}
        <div style={{ marginBottom: "20px" }}>
          <a href="/factures" style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "#1F2937", color: "white", textDecoration: "none",
            fontSize: "14px", fontWeight: "600", padding: "8px 16px", borderRadius: "8px",
          }}>
            ← Retour aux factures
          </a>
        </div>

        {/* Header */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "12px", color: "#6B7280", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
            Factures
          </div>
          <h1 style={{ fontSize: "26px", fontWeight: "800", color: "#1F2937", margin: "0 0 4px" }}>
            Import en lot
          </h1>
          <p style={{ margin: 0, fontSize: "14px", color: "#6B7280" }}>
            Importe toutes tes factures depuis le début de l&apos;année en une seule opération.
          </p>
        </div>

        <ImportLotForm />

      </main>
    </div>
  );
}
