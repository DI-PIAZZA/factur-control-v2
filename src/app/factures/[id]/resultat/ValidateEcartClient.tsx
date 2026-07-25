"use client";

import { useState } from "react";

interface ValidateEcartClientProps {
  alertId: string;
  lineId: string;
  invoiceId: string;
  supplierId: string;
  refArticle: string | null;
  label: string;
  unitPrice: number;
  invoicedPrice: number;
  onValidated?: (lineId: string) => void;
}

export default function ValidateEcartClient({
  alertId,
  lineId,
  invoiceId,
  supplierId,
  refArticle,
  label,
  unitPrice,
  invoicedPrice,
  onValidated,
}: ValidateEcartClientProps) {
  const [validating, setValidating] = useState(false);
  const [status, setStatus] = useState<"pending" | "validated" | "rejected">("pending");

  const handleValidate = async () => {
    setValidating(true);
    try {
      // Ajouter la ligne au tarif du fournisseur avec le prix facturé
      const res = await fetch("/api/validate-ecart", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          alert_id: alertId,
          line_id: lineId,
          invoice_id: invoiceId,
          supplier_id: supplierId,
          ref_article: refArticle || "",
          label,
          unit_price: invoicedPrice,
        }),
      });

      if (res.ok) {
        setStatus("validated");
        onValidated?.(lineId);
      }
    } catch {
      // erreur silencieuse
    } finally {
      setValidating(false);
    }
  };

  const handleReject = () => {
    setStatus("rejected");
    onValidated?.(lineId);
  };

  if (status === "validated") {
    return (
      <span
        style={{
          display: "inline-block",
          fontSize: "11px",
          fontWeight: "700",
          padding: "3px 10px",
          borderRadius: "20px",
          background: "#DCFCE7",
          color: "#16A34A",
          border: "1px solid #86EFAC",
          whiteSpace: "nowrap",
        }}
      >
        ✓ Validé
      </span>
    );
  }

  if (status === "rejected") {
    return (
      <span
        style={{
          display: "inline-block",
          fontSize: "11px",
          fontWeight: "700",
          padding: "3px 10px",
          borderRadius: "20px",
          background: "#FEF9C3",
          color: "#B45309",
          border: "1px solid #FDE68A",
          whiteSpace: "nowrap",
        }}
      >
        ⊘ Pas validé
      </span>
    );
  }

  return (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
      <button
        onClick={handleValidate}
        disabled={validating}
        style={{
          background: "#16A34A",
          color: "white",
          border: "none",
          borderRadius: "6px",
          padding: "4px 10px",
          fontSize: "11px",
          fontWeight: "700",
          cursor: validating ? "not-allowed" : "pointer",
          opacity: validating ? 0.6 : 1,
        }}
        title="Accepter cet écart et l'ajouter au tarif"
      >
        {validating ? "…" : "✓ Valider"}
      </button>
      <button
        onClick={handleReject}
        disabled={validating}
        style={{
          background: "#FCD34D",
          color: "#92400E",
          border: "1px solid #F59E0B",
          borderRadius: "6px",
          padding: "4px 10px",
          fontSize: "11px",
          fontWeight: "700",
          cursor: validating ? "not-allowed" : "pointer",
          opacity: validating ? 0.6 : 1,
        }}
        title="Rejeter cet écart (inclure dans la demande d'avoir)"
      >
        ⊘ Pas valider
      </button>
    </div>
  );
}
