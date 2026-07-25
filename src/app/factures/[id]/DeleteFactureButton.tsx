"use client";

import { useState } from "react";
import { deleteFactureAction } from "./actions";

export default function DeleteFactureButton({ invoiceId }: { invoiceId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  if (confirming) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "13px", color: "#DC2626", fontWeight: "600" }}>Supprimer cette facture ?</span>
        <button
          onClick={async () => {
            setLoading(true);
            await deleteFactureAction(invoiceId);
          }}
          disabled={loading}
          style={{ background: "#DC2626", color: "white", border: "none", borderRadius: "6px", padding: "6px 14px", fontSize: "13px", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "…" : "Oui, supprimer"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={loading}
          style={{ background: "#F3F4F6", color: "#374151", border: "none", borderRadius: "6px", padding: "6px 12px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
        >
          Annuler
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA", borderRadius: "8px", padding: "8px 16px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}
    >
      🗑️ Supprimer la facture
    </button>
  );
}
