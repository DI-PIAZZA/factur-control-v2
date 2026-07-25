"use client";

import { useState, useTransition } from "react";
import { ajouterAuTarifAction, ignorerAlertAction } from "./resultat-actions";

interface Props {
  alertId: string;
  invoiceId: string;
  supplierId: string;
  refArticle: string | null;
  label: string;
  unitPrice: number;
}

export default function HorsTarifActions({
  alertId,
  invoiceId,
  supplierId,
  refArticle,
  label,
  unitPrice,
}: Props) {
  const [done, setDone] = useState<"added" | "ignored" | null>(null);
  const [isPending, startTransition] = useTransition();

  if (done === "added") {
    return (
      <span style={{ fontSize: "12px", color: "#16A34A", fontWeight: "700" }}>
        ✅ Ajouté au tarif
      </span>
    );
  }
  if (done === "ignored") {
    return (
      <span style={{ fontSize: "12px", color: "#9CA3AF" }}>
        Ignoré
      </span>
    );
  }

  return (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
      <button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await ajouterAuTarifAction({ supplierId, invoiceId, refArticle, label, unitPrice });
            setDone("added");
          })
        }
        style={{
          background: "#7C3AED", color: "white", border: "none", borderRadius: "6px",
          padding: "4px 10px", fontSize: "11px", fontWeight: "700",
          cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.6 : 1,
          whiteSpace: "nowrap",
        }}
      >
        + Ajouter au tarif
      </button>
      <button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await ignorerAlertAction(alertId, invoiceId);
            setDone("ignored");
          })
        }
        style={{
          background: "#F3F4F6", color: "#6B7280", border: "none", borderRadius: "6px",
          padding: "4px 10px", fontSize: "11px", fontWeight: "600",
          cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.6 : 1,
        }}
      >
        Ignorer
      </button>
    </div>
  );
}
