import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import NouveauFournisseurForm from "./NouveauFournisseurForm";

export default async function NouveauFournisseurPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar userEmail={user.email ?? ""} />

      <main style={{ flex: 1, background: "#F1F5F9", padding: "32px" }}>
        <div style={{ maxWidth: "640px" }}>
          {/* Fil d'Ariane */}
          <div style={{ marginBottom: "20px" }}>
            <Link
              href="/fournisseurs"
              style={{
                color: "#6B7280",
                textDecoration: "none",
                fontSize: "14px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              ← Retour aux fournisseurs
            </Link>
          </div>

          <h1
            style={{
              fontSize: "22px",
              fontWeight: "700",
              color: "#1F2937",
              marginBottom: "24px",
            }}
          >
            Ajouter un fournisseur
          </h1>

          <NouveauFournisseurForm />
        </div>
      </main>
    </div>
  );
}
