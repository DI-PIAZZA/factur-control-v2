"use client";

import { useRef, useState, useTransition } from "react";
import { saveConditionsAction } from "./conditions-actions";

interface Props {
  supplierId: string;
  remiseFournDebut: string | null;
  remiseFournFin: string | null;
  rfaFournDebut: string | null;
  rfaFournFin: string | null;
}

function fmt(d: string | null) {
  // Supabase retourne "YYYY-MM-DD", l'input[date] attend ce format directement
  return d ?? "";
}

export default function ConditionsCommercialesForm({
  supplierId,
  remiseFournDebut,
  remiseFournFin,
  rfaFournDebut,
  rfaFournFin,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const data = new FormData(formRef.current!);
    startTransition(async () => {
      try {
        await saveConditionsAction(data);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch (err) {
        setError(String(err));
      }
    });
  }

  const rows: { label: string; debut: string; fin: string; nameDebut: string; nameFin: string; color: string; bg: string }[] = [
    {
      label: "Remise fournisseur",
      debut: fmt(remiseFournDebut),
      fin: fmt(remiseFournFin),
      nameDebut: "remise_fourn_debut",
      nameFin: "remise_fourn_fin",
      color: "#1D4ED8",
      bg: "#EFF6FF",
    },
    {
      label: "RFA fournisseur",
      debut: fmt(rfaFournDebut),
      fin: fmt(rfaFournFin),
      nameDebut: "rfa_fourn_debut",
      nameFin: "rfa_fourn_fin",
      color: "#4338CA",
      bg: "#EEF2FF",
    },
  ];

  return (
    <div
      style={{
        background: "white",
        borderRadius: "12px",
        padding: "20px 24px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        marginBottom: "24px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#1F2937", margin: 0 }}>
          Conditions commerciales — périodes de validité
        </h2>
        {saved && (
          <span style={{ fontSize: "13px", color: "#16A34A", fontWeight: "600" }}>
            ✅ Enregistré
          </span>
        )}
        {error && (
          <span style={{ fontSize: "13px", color: "#DC2626", fontWeight: "600" }}>
            ⚠️ {error}
          </span>
        )}
      </div>

      <form ref={formRef} onSubmit={handleSubmit}>
        <input type="hidden" name="supplier_id" value={supplierId} />

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {rows.map((row) => (
            <div
              key={row.nameDebut}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 14px",
                background: row.bg,
                borderRadius: "8px",
                flexWrap: "wrap",
              }}
            >
              {/* Label */}
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  color: row.color,
                  width: "160px",
                  flexShrink: 0,
                }}
              >
                {row.label}
              </span>

              {/* Dates */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                <label style={{ fontSize: "12px", color: "#6B7280", whiteSpace: "nowrap" }}>du</label>
                <input
                  type="date"
                  name={row.nameDebut}
                  defaultValue={row.debut}
                  style={{
                    border: "1px solid #D1D5DB",
                    borderRadius: "6px",
                    padding: "5px 8px",
                    fontSize: "13px",
                    color: "#1F2937",
                    background: "white",
                    outline: "none",
                  }}
                />
                <label style={{ fontSize: "12px", color: "#6B7280", whiteSpace: "nowrap" }}>au</label>
                <input
                  type="date"
                  name={row.nameFin}
                  defaultValue={row.fin}
                  style={{
                    border: "1px solid #D1D5DB",
                    borderRadius: "6px",
                    padding: "5px 8px",
                    fontSize: "13px",
                    color: "#1F2937",
                    background: "white",
                    outline: "none",
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "14px", display: "flex", justifyContent: "flex-end" }}>
          <button
            type="submit"
            disabled={isPending}
            style={{
              background: isPending ? "#9CA3AF" : "#E85A00",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "9px 20px",
              fontSize: "13px",
              fontWeight: "700",
              cursor: isPending ? "not-allowed" : "pointer",
            }}
          >
            {isPending ? "Enregistrement…" : "Enregistrer les périodes"}
          </button>
        </div>
      </form>
    </div>
  );
}
