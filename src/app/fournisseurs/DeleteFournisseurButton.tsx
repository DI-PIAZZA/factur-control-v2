"use client";

import { useState } from "react";
import { deleteSupplierAction } from "./actions";

export default function DeleteFournisseurButton({ supplierId, supplierName }: { supplierId: string; supplierName: string }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  if (confirming) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
        <span style={{ fontSize: "12px", color: "#DC2626", fontWeight: "600" }}>Supprimer ?</span>
        <button
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            await deleteSupplierAction(supplierId);
          }}
          style={{
            fontSize: "12px", fontWeight: "700", color: "white",
            background: "#DC2626", border: "none", borderRadius: "6px",
            padding: "5px 10px", cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "…" : "Oui"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          style={{
            fontSize: "12px", fontWeight: "600", color: "#6B7280",
            background: "white", border: "1px solid #E5E7EB", borderRadius: "6px",
            padding: "5px 10px", cursor: "pointer",
          }}
        >
          Non
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      title={`Supprimer ${supplierName}`}
      style={{
        fontSize: "12px", fontWeight: "600", color: "#DC2626",
        background: "white", border: "1px solid #FCA5A5", borderRadius: "6px",
        padding: "5px 10px", cursor: "pointer", display: "inline-block",
      }}
    >
      🗑️ Supprimer
    </button>
  );
}
