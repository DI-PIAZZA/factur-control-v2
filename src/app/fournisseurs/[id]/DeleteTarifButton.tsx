"use client";

import { deleteTarifAction } from "./actions";

export default function DeleteTarifButton({ supplierId, count }: { supplierId: string; count: number }) {
  const action = deleteTarifAction.bind(null, supplierId);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Supprimer les ${count} lignes du tarif ? Cette action est irréversible.`)) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        style={{
          background: "#FEF2F2",
          color: "#DC2626",
          border: "1px solid #FCA5A5",
          padding: "6px 14px",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: "600",
          cursor: "pointer",
        }}
      >
        🗑️ Supprimer le tarif
      </button>
    </form>
  );
}
