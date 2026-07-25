"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Supplier {
  id: string;
  name: string;
  nom_commercial?: string | null;
}

function ExtractingLoader({ supplierName, fileName }: { supplierName: string; fileName: string }) {
  const [progress, setProgress] = useState(0);
  const steps = [
    { label: "Lecture du relevé", icon: "📋" },
    { label: "Extraction des numéros de factures", icon: "🔍" },
    { label: "Vérification dans l'historique", icon: "✅" },
  ];
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const durations = [4000, 8000, 6000];
    let elapsed = 0;
    const total = durations.reduce((a, b) => a + b, 0);
    const interval = setInterval(() => {
      elapsed += 100;
      setProgress(Math.min((elapsed / total) * 100, 97));
      let stepIdx = durations.length - 1;
      let cumul = 0;
      for (let i = 0; i < durations.length; i++) {
        cumul += durations[i];
        if (elapsed < cumul) { stepIdx = i; break; }
      }
      setCurrentStep(stepIdx);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ background: "white", borderRadius: "16px", padding: "36px 32px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
      <style>{`@keyframes fc-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} } @keyframes fc-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "56px", height: "56px", background: "#EFF6FF", borderRadius: "50%", marginBottom: "16px" }}>
          <div style={{ width: "28px", height: "28px", border: "3px solid #1D4ED8", borderTopColor: "transparent", borderRadius: "50%", animation: "fc-spin 0.8s linear infinite" }} />
        </div>
        <div style={{ fontSize: "17px", fontWeight: "800", color: "#1F2937", marginBottom: "4px" }}>Claude analyse le relevé…</div>
        <div style={{ fontSize: "13px", color: "#9CA3AF" }}>
          {fileName && <span style={{ color: "#6B7280" }}>📋 {fileName} · </span>}
          {supplierName}
        </div>
      </div>
      <div style={{ background: "#F3F4F6", borderRadius: "8px", height: "8px", marginBottom: "28px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #1D4ED8, #3B82F6)", borderRadius: "8px", transition: "width 0.3s ease" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {steps.map((s, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", background: done ? "#16A34A" : active ? "#EFF6FF" : "#F9FAFB", border: `2px solid ${done ? "#16A34A" : active ? "#1D4ED8" : "#E5E7EB"}` }}>
                {done ? "✓" : s.icon}
              </div>
              <span style={{ fontSize: "14px", fontWeight: active ? "700" : done ? "500" : "400", color: done ? "#16A34A" : active ? "#1F2937" : "#9CA3AF", animation: active ? "fc-pulse 1.5s ease-in-out infinite" : undefined }}>
                {s.label}{active && <span style={{ marginLeft: "6px", color: "#1D4ED8" }}>…</span>}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: "20px", textAlign: "center", fontSize: "12px", color: "#D1D5DB" }}>15 à 30 secondes selon la taille du relevé</div>
    </div>
  );
}

export default function UploadReleveForm({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);
  const supplierName = selectedSupplier?.nom_commercial || selectedSupplier?.name || "";

  async function handleFile(f: File) {
    if (!supplierId) return;
    setFile(f);
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.set("pdf", f);
    formData.set("supplier_id", supplierId);
    formData.set("supplier_name", supplierName);

    const res = await fetch("/api/extract-releve", { method: "POST", body: formData });
    const data = await res.json();

    if (!res.ok || !data.releve_id) {
      setError(data.error ?? "Erreur lors de l'analyse");
      setLoading(false);
      return;
    }

    router.push(`/releves/${data.releve_id}`);
  }

  // — ÉTAPE 1 : Choix du fournisseur —
  if (!supplierId) {
    return (
      <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <div style={{ fontSize: "13px", fontWeight: "700", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "16px" }}>
          Choisissez le fournisseur
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
          {suppliers.map((s) => {
            const label = s.nom_commercial || s.name;
            const sub = s.nom_commercial ? s.name : null;
            return (
              <button
                key={s.id}
                onClick={() => setSupplierId(s.id)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "flex-start",
                  padding: "16px 18px", borderRadius: "10px",
                  border: "2px solid #E5E7EB", background: "white",
                  cursor: "pointer", textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#1D4ED8";
                  (e.currentTarget as HTMLButtonElement).style.background = "#EFF6FF";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#E5E7EB";
                  (e.currentTarget as HTMLButtonElement).style.background = "white";
                }}
              >
                <div style={{ fontSize: "24px", marginBottom: "10px" }}>🏢</div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#1F2937", lineHeight: 1.3 }}>{label}</div>
                {sub && <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "3px" }}>{sub}</div>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // — ÉTAPE 2 : Upload du relevé —
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Fournisseur sélectionné */}
      {!loading && (
        <div style={{ background: "white", borderRadius: "12px", padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", background: "#1D4ED8", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>🏢</div>
            <div style={{ fontSize: "15px", fontWeight: "700", color: "#1F2937" }}>{supplierName}</div>
          </div>
          <button
            onClick={() => { setSupplierId(null); setFile(null); setError(null); }}
            style={{ fontSize: "13px", fontWeight: "600", color: "#6B7280", background: "#F3F4F6", border: "none", borderRadius: "6px", padding: "6px 12px", cursor: "pointer" }}
          >
            Changer
          </button>
        </div>
      )}

      {/* Zone de dépôt */}
      {!loading && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? "#1D4ED8" : file ? "#16A34A" : "#D1D5DB"}`,
            borderRadius: "16px", padding: "56px 32px", textAlign: "center", cursor: "pointer",
            background: isDragging ? "#EFF6FF" : file ? "#F0FDF4" : "white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <input ref={fileRef} type="file" accept=".pdf,application/pdf" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          {!file ? (
            <>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
              <div style={{ fontSize: "16px", fontWeight: "700", color: "#1F2937", marginBottom: "8px" }}>Glissez le relevé PDF ici</div>
              <div style={{ fontSize: "13px", color: "#9CA3AF" }}>ou cliquez pour parcourir</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>✅</div>
              <div style={{ fontSize: "15px", fontWeight: "700", color: "#16A34A" }}>{file.name}</div>
            </>
          )}
        </div>
      )}

      {/* Loader */}
      {loading && <ExtractingLoader supplierName={supplierName} fileName={file?.name ?? ""} />}

      {/* Erreur */}
      {error && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: "8px", padding: "14px 16px", color: "#DC2626", fontSize: "14px", fontWeight: "600" }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
