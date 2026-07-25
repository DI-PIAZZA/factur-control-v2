import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { updateSupplierAction } from "./actions";

export default async function ModifierFournisseurPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { id } = await params;
  const { erreur } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: supplier, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !supplier) notFound();

  const action = updateSupplierAction.bind(null, id);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar userEmail={user.email ?? ""} />

      <main style={{ flex: 1, background: "#F1F5F9", padding: "32px" }}>
        <div style={{ maxWidth: "520px" }}>
          {/* Fil d'Ariane */}
          <div style={{ marginBottom: "20px", fontSize: "14px", color: "#6B7280" }}>
            <Link href="/fournisseurs" style={{ color: "#6B7280", textDecoration: "none" }}>Fournisseurs</Link>
            {" › "}
            <Link href={`/fournisseurs/${id}`} style={{ color: "#6B7280", textDecoration: "none" }}>{supplier.name}</Link>
            {" › "}
            <span style={{ color: "#1F2937" }}>Modifier</span>
          </div>

          <h1 style={{ fontSize: "20px", fontWeight: "800", color: "#1F2937", marginBottom: "6px" }}>
            Modifier le fournisseur
          </h1>
          <p style={{ fontSize: "14px", color: "#6B7280", marginBottom: "24px", marginTop: 0 }}>
            {supplier.name} — SIRET {supplier.siret || "non renseigné"}
          </p>

          {erreur && (
            <div style={{
              background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: "8px",
              padding: "12px 16px", color: "#DC2626", fontSize: "14px", marginBottom: "20px",
            }}>
              ⚠️ {erreur}
            </div>
          )}

          <div style={{
            background: "white", borderRadius: "12px", padding: "28px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}>
            <form action={action} style={{ display: "flex", flexDirection: "column", gap: "22px" }}>

              {/* Enseigne commerciale */}
              <div>
                <label style={labelStyle}>Enseigne commerciale</label>
                <p style={hintStyle}>
                  Le nom sous lequel ce fournisseur est connu commercialement (ex : Montana Pietrini, Point P…).
                  Affiché sous la raison sociale.
                </p>
                <input
                  name="nom_commercial"
                  defaultValue={supplier.nom_commercial ?? ""}
                  placeholder="Ex : Montana Pietrini"
                  style={inputStyle}
                />
              </div>

              {/* Localisation */}
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: "0 0 120px" }}>
                  <label style={labelStyle}>Code postal</label>
                  <input
                    name="code_postal"
                    defaultValue={supplier.code_postal ?? ""}
                    placeholder="84000"
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Ville</label>
                  <input
                    name="ville"
                    defaultValue={supplier.ville ?? ""}
                    placeholder="Avignon"
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Email facturation */}
              <div>
                <label style={labelStyle}>Mail d&apos;envoi des factures</label>
                <p style={hintStyle}>
                  L&apos;adresse depuis laquelle ce fournisseur vous envoie ses factures.
                  Permet d&apos;identifier automatiquement le fournisseur à la réception.
                </p>
                <input
                  name="email_facturation"
                  type="email"
                  defaultValue={supplier.email_facturation ?? ""}
                  placeholder="Ex : factures@fournisseur.fr"
                  style={inputStyle}
                />
              </div>

              {/* Colonne tarif */}
              <div>
                <label style={labelStyle}>Colonne de contrôle tarifaire</label>
                <p style={hintStyle}>
                  Le nom de la colonne prix à utiliser dans le tarif de ce fournisseur
                  (ex : &quot;Prix Net&quot;, &quot;Tarif HT&quot;, &quot;Net Facture&quot;…).
                  Le libellé de la colonne dans son PDF de tarif.
                </p>
                <input
                  name="price_column"
                  defaultValue={supplier.price_column ?? ""}
                  placeholder="Ex : Prix Net HT"
                  style={inputStyle}
                />
              </div>

              {/* Boutons */}
              <div style={{ display: "flex", gap: "12px", paddingTop: "4px" }}>
                <button type="submit" style={{
                  background: "#E85A00", color: "white",
                  padding: "12px 28px", borderRadius: "8px",
                  fontSize: "14px", fontWeight: "700", border: "none", cursor: "pointer",
                }}>
                  Enregistrer
                </button>
                <Link href={`/fournisseurs/${id}`} style={{
                  background: "#F3F4F6", color: "#6B7280",
                  padding: "12px 24px", borderRadius: "8px",
                  fontSize: "14px", fontWeight: "600", textDecoration: "none",
                  display: "inline-flex", alignItems: "center",
                }}>
                  Annuler
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "13px", fontWeight: "700",
  color: "#374151", marginBottom: "4px",
};

const hintStyle: React.CSSProperties = {
  fontSize: "12px", color: "#9CA3AF", margin: "0 0 8px",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px",
  border: "1px solid #D1D5DB", borderRadius: "8px",
  fontSize: "14px", color: "#1F2937", outline: "none", boxSizing: "border-box",
};
