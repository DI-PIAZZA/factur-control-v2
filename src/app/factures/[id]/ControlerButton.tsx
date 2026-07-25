"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ControlerButton({ invoiceId }: { invoiceId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleControler() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: invoiceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur");
      router.push("/factures/" + invoiceId + "/resultat");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleControler}
        disabled={loading}
        style={{
          background: loading ? "#9CA3AF" : "#1D4ED8",
          color: "white",
          border: "none",
          borderRadius: "8px",
          padding: "10px 20px",
          fontSize: "14px",
          fontWeight: "700",
          cursor: loading ? "not-allowed" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        {loading ? "⏳ Contrôle en cours…" : "🔍 Contrôler la facture"}
      </button>
      {error && (
        <div style={{ marginTop: "8px", color: "#DC2626", fontSize: "13px" }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
