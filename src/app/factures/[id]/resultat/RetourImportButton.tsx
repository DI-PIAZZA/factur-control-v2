"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface ResultatProcess {
  nom_fichier: string;
  statut: "ok" | "erreur" | "ignoré";
  invoice_id?: string;
  numero_facture?: string;
  date_facture?: string;
  total_ht?: number;
  nb_lignes?: number;
  nb_alertes?: number;
  rapproche?: boolean;
  raison?: string;
}

export default function RetourImportButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRetour = async () => {
    setLoading(true);
    try {
      // Récupérer les données de sessionStorage
      const stored = sessionStorage.getItem("import-lot-state");
      if (!stored) {
        // Pas de state, juste retourner
        router.push("/factures/import-lot");
        return;
      }

      const state = JSON.parse(stored);
      const resultatsProcess = state.resultatsProcess as ResultatProcess[] || [];

      // Extraire les invoice_id
      const invoiceIds = resultatsProcess
        .filter((r) => r.invoice_id)
        .map((r) => r.invoice_id);

      if (invoiceIds.length === 0) {
        router.push("/factures/import-lot");
        return;
      }

      // Appeler le refresh
      const response = await fetch("/api/import-lot/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceIds }),
      });

      if (!response.ok) throw new Error("Refresh failed");

      const refreshed = await response.json();

      // Mettre à jour resultatsProcess avec les nouvelles données
      const updated = resultatsProcess.map((r) => {
        const refreshedData = refreshed.find((ref: any) => ref.invoice_id === r.invoice_id);
        if (refreshedData) {
          return {
            ...r,
            nb_lignes: refreshedData.nb_lignes,
            nb_alertes: refreshedData.nb_alertes,
            total_ht: refreshedData.total_ht,
          };
        }
        return r;
      });

      // Sauvegarder dans sessionStorage
      sessionStorage.setItem(
        "import-lot-state",
        JSON.stringify({
          ...state,
          resultatsProcess: updated,
        })
      );

      // Retourner
      router.push("/factures/import-lot");
    } catch (error) {
      console.error("Erreur lors du refresh:", error);
      // En cas d'erreur, retourner quand même
      router.push("/factures/import-lot");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleRetour}
      disabled={loading}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        background: "#E85A00",
        color: "white",
        textDecoration: "none",
        fontSize: "14px",
        fontWeight: "600",
        padding: "8px 16px",
        borderRadius: "8px",
        border: "none",
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.6 : 1,
      }}
    >
      ← {loading ? "Chargement..." : "Retour à l'import"}
    </button>
  );
}
