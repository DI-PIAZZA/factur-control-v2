import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import DeleteTarifButton from "./DeleteTarifButton";
import TarifTable from "./TarifTable";
import ChangeColonneButton from "./ChangeColonneButton";
import ConditionsCommercialesForm from "./ConditionsCommercialesForm";

export default async function FournisseurDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string }>;
}) {
  const { id } = await params;
  const { success } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Récupère le fournisseur
  const { data: supplier, error: supplierError } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", id)
    .single();

  if (supplierError || !supplier) notFound();

  // Récupère les lignes de tarif
  const { data: tarifs } = await supabase
    .from("price_references")
    .select("*")
    .eq("supplier_id", id)
    .order("label", { ascending: true });

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar userEmail={user.email ?? ""} />

      <main style={{ flex: 1, background: "#F1F5F9", padding: "24px 32px" }}>
        <div style={{ maxWidth: "100%" }}>
          {/* Retour */}
          <div style={{ marginBottom: "20px" }}>
            <Link
              href="/fournisseurs"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "#1F2937",
                color: "white",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "600",
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
              }}
            >
              ← Retour aux fournisseurs
            </Link>
          </div>

          {/* Header fournisseur */}
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              marginBottom: "24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: "22px",
                  fontWeight: "800",
                  color: "#1F2937",
                  marginBottom: "2px",
                }}
              >
                {supplier.name}
              </h1>
              {(supplier.nom_commercial || supplier.code_postal || supplier.ville) && (
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px", flexWrap: "wrap" }}>
                  {supplier.nom_commercial && supplier.nom_commercial !== supplier.name && (
                    <span style={{ fontSize: "14px", fontWeight: "600", color: "#E85A00" }}>
                      {supplier.nom_commercial}
                    </span>
                  )}
                  {(supplier.code_postal || supplier.ville) && (
                    <span style={{ fontSize: "13px", color: "#9CA3AF" }}>
                      📍 {[supplier.code_postal, supplier.ville].filter(Boolean).join(" ")}
                    </span>
                  )}
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  gap: "24px",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: "13px", color: "#6B7280" }}>
                  SIRET :{" "}
                  <span style={{ fontFamily: "monospace", color: "#374151" }}>
                    {supplier.siret || "—"}
                  </span>
                </span>
                <span style={{ fontSize: "13px", color: "#6B7280" }}>
                  Ajouté le :{" "}
                  <span style={{ color: "#374151" }}>
                    {new Date(supplier.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </span>
                {supplier.email_facturation && (
                  <span style={{ fontSize: "13px", color: "#6B7280" }}>
                    ✉️ Mail factures :{" "}
                    <span style={{ color: "#374151" }}>{supplier.email_facturation}</span>
                  </span>
                )}
                {supplier.price_column && (
                  <span style={{ fontSize: "13px", color: "#6B7280", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    Colonne tarif :{" "}
                    <span style={{
                      background: "#F0FDF4", color: "#15803D",
                      padding: "2px 8px", borderRadius: "4px",
                      fontSize: "12px", fontWeight: "700",
                      border: "1px solid #86EFAC",
                    }}>
                      {supplier.price_column}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "10px", flexShrink: 0 }}>
              <Link
                href={`/fournisseurs/${id}/modifier`}
                style={{
                  background: "white",
                  color: "#374151",
                  border: "1px solid #D1D5DB",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "600",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                ✏️ Modifier
              </Link>
              <Link
                href={`/fournisseurs/${id}/nouveau-tarif`}
                style={{
                  background: "#E85A00",
                  color: "white",
                  padding: "10px 18px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "600",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                + Ajouter un tarif
              </Link>
            </div>
          </div>

          {/* Bannières succès */}
          {(success === "1" || success === "modif") && (
            <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: "8px", padding: "10px 8px", color: "#16A34A", fontSize: "14px", fontWeight: "600", marginBottom: "20px" }}>
              ✅ {success === "modif" ? "Fournisseur mis à jour" : "Tarif ajouté avec succès"}
            </div>
          )}
          {success === "tarif_supprime" && (
            <div style={{ background: "#FFF7ED", border: "1px solid #FDBA74", borderRadius: "8px", padding: "10px 8px", color: "#EA580C", fontSize: "14px", fontWeight: "600", marginBottom: "20px" }}>
              🗑️ Tarif supprimé
            </div>
          )}

          {/* Conditions commerciales */}
          <ConditionsCommercialesForm
            supplierId={id}
            remiseFournDebut={supplier.remise_fourn_debut ?? null}
            remiseFournFin={supplier.remise_fourn_fin ?? null}
            rfaFournDebut={supplier.rfa_fourn_debut ?? null}
            rfaFournFin={supplier.rfa_fourn_fin ?? null}
          />

          {/* Section tarif */}
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              overflow: "hidden",
            }}
          >
            {/* En-tête section */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #F3F4F6",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#1F2937", margin: 0 }}>
                Tarif de référence
                <span
                  style={{
                    marginLeft: "8px",
                    background: "#EFF6FF",
                    color: "#1D4ED8",
                    fontSize: "12px",
                    fontWeight: "700",
                    padding: "2px 8px",
                    borderRadius: "12px",
                  }}
                >
                  {tarifs?.length ?? 0} ligne{(tarifs?.length ?? 0) > 1 ? "s" : ""}
                </span>
              </h2>
              {/* Actions tarif */}
              {tarifs && tarifs.length > 0 && (
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {supplier.tarif_file_path && (
                    <Link
                      href={`/api/tarif-file?supplierId=${id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Ouvrir le fichier tarif original"
                      style={{
                        background: "#F5F3FF", color: "#7C3AED",
                        border: "1px solid #DDD6FE",
                        borderRadius: "6px", padding: "6px 14px",
                        fontSize: "13px", fontWeight: "600",
                        textDecoration: "none",
                        display: "inline-flex", alignItems: "center", gap: "6px",
                      }}
                    >
                      📄 Voir le tarif
                    </Link>
                  )}
                  <ChangeColonneButton supplierId={id} currentColumn={supplier.price_column ?? ""} />
                  <DeleteTarifButton supplierId={id} count={tarifs.length} />
                </div>
              )}
            </div>

            {/* Vide */}
            {(!tarifs || tarifs.length === 0) && (
              <div
                style={{
                  padding: "48px 32px",
                  textAlign: "center",
                  color: "#6B7280",
                  fontSize: "14px",
                }}
              >
                <div style={{ fontSize: "36px", marginBottom: "12px" }}>📋</div>
                <p style={{ margin: "0 0 20px" }}>
                  Aucun tarif. Uploadez le fichier de tarif de ce fournisseur (PDF ou Excel).
                </p>
                <Link
                  href={`/fournisseurs/${id}/nouveau-tarif`}
                  style={{
                    background: "#E85A00",
                    color: "white",
                    padding: "10px 20px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: "600",
                    textDecoration: "none",
                    display: "inline-block",
                  }}
                >
                  + Ajouter un tarif
                </Link>
              </div>
            )}

            {/* Tableau tarif avec recherche */}
            {tarifs && tarifs.length > 0 && (
              <TarifTable tarifs={tarifs} priceColumnName={supplier.price_column ?? null} costColumnName={supplier.cost_column ?? null} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
