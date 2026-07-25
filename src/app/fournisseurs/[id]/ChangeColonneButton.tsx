"use client";

import { useState, useTransition } from "react";
import { resetTarifForColumnChangeAction } from "./actions";

export default function ChangeColonneButton({
  supplierId,
  currentColumn,
}: {
  supplierId: string;
  currentColumn: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("supplier_id", supplierId);
      await resetTarifForColumnChangeAction(fd);
    });
  };

  if (confirming) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "12px", color: "#DC2626", fontWeight: "600" }}>
          ⚠️ Le tarif sera supprimé — re-upload requis
        </span>
        <button
          onClick={handleConfirm}
          disabled={isPending}
          style={{
            background: "#DC2626", color: "white", border: "none",
            borderRadius: "6px", padding: "5px 12px",
            fontSize: "12px", fontWeight: "700", cursor: isPending ? "not-allowed" : "pointer",
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending ? "…" : "Oui, changer"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={isPending}
          style={{
            background: "#F3F4F6", color: "#374151", border: "none",
            borderRadius: "6px", padding: "5px 10px",
            fontSize: "12px", fontWeight: "600", cursor: "pointer",
          }}
        >
          Annuler
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      title={currentColumn ? `Colonne active : ${currentColumn}` : "Définir la colonne de référence"}
      style={{
        background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE",
        borderRadius: "6px", padding: "6px 14px",
        fontSize: "13px", fontWeight: "600", cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: "6px",
      }}
    >
      🔄 Changer réf. prix
    </button>
  );
}
