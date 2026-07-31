"use client";

import { useState } from "react";

interface AutoriseFournisseurButtonProps {
  supplierId: string;
  isAuthorized: boolean;
  platforms: string[];
}

export default function AutoriseFournisseurButton({
  supplierId,
  isAuthorized,
  platforms,
}: AutoriseFournisseurButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleAuthorize = async () => {
    setLoading(true);
    try {
      // Lancer l'OAuth Chorus Pro
      const res = await fetch("/api/e-invoice/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, platform: "chorus" }),
      });

      const data = await res.json();
      if (data.authUrl) {
        // Rediriger vers Chorus
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error("Erreur OAuth:", error);
      setLoading(false);
    }
  };

  if (isAuthorized) {
    return (
      <div style={{
        display: "flex", gap: "8px", alignItems: "center",
        fontSize: "12px", color: "#6B7280",
      }}>
        <span>{platforms.join(", ")}</span>
        <button
          onClick={handleAuthorize}
          disabled={loading}
          style={{
            fontSize: "12px", fontWeight: "600", color: "#DC2626",
            textDecoration: "none", padding: "4px 8px",
            border: "1px solid #FCA5A5", borderRadius: "4px",
            background: "white", cursor: "pointer",
          }}
        >
          {loading ? "..." : "Réautoriser"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleAuthorize}
      disabled={loading}
      style={{
        fontSize: "12px", fontWeight: "600", color: "white",
        textDecoration: "none", padding: "6px 14px",
        borderRadius: "6px", background: "#E85A00",
        border: "none", cursor: "pointer",
      }}
    >
      {loading ? "Connexion..." : "Autoriser"}
    </button>
  );
}
