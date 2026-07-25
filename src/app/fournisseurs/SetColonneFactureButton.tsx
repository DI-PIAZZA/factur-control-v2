"use client";

export default function SetColonneFactureButton({
  supplierId,
  currentValue,
  latestInvoiceId,
}: {
  supplierId: string;
  currentValue?: string | null;
  latestInvoiceId?: string | null;
}) {
  // Pas de facture → bouton rouge désactivé
  if (!latestInvoiceId) {
    return (
      <button
        disabled
        title="Uploadez d'abord une facture pour ce fournisseur"
        style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          background: "#FEF2F2", color: "#DC2626",
          border: "1px solid #FECACA",
          borderRadius: "6px", padding: "4px 10px",
          fontSize: "12px", fontWeight: "600",
          cursor: "not-allowed", whiteSpace: "nowrap", opacity: 0.7,
        }}
      >
        🚫 Aucune facture
      </button>
    );
  }

  // Facture disponible → lien vers la facture pour définir la colonne
  return (
    <a
      href={`/factures/${latestInvoiceId}?set_colonne=1&supplier_id=${supplierId}`}
      style={{
        display: "inline-flex", alignItems: "center", gap: "6px",
        background: currentValue ? "#EFF6FF" : "#FFF7ED",
        color: currentValue ? "#1D4ED8" : "#EA580C",
        border: `1px solid ${currentValue ? "#BFDBFE" : "#FDBA74"}`,
        borderRadius: "6px", padding: "4px 10px",
        fontSize: "12px", fontWeight: "600",
        textDecoration: "none", whiteSpace: "nowrap",
      }}
    >
      {currentValue ? `📊 ${currentValue}` : "📊 Définir colonne"}
    </a>
  );
}
