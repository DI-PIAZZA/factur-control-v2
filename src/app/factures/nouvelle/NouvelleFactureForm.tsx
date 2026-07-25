"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveInvoicePriceColumnAction } from "@/app/fournisseurs/[id]/actions";

const steps = [
  { label: "Lecture de la facture", icon: "📄" },
  { label: "Identification du fournisseur", icon: "🔍" },
  { label: "Extraction des lignes", icon: "⚡" },
  { label: "Vérification & classement", icon: "✅" },
];

function ExtractingLoader({ supplierName, fileName }: { supplierName: string; fileName: string }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const durations = [3000, 6000, 10000, 6000];
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
      <style>{`
        @keyframes fc-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fc-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "56px", height: "56px", background: "#EFF6FF", borderRadius: "50%", marginBottom: "16px" }}>
          <div style={{ width: "28px", height: "28px", border: "3px solid #1D4ED8", borderTopColor: "transparent", borderRadius: "50%", animation: "fc-spin 0.8s linear infinite" }} />
        </div>
        <div style={{ fontSize: "17px", fontWeight: "800", color: "#1F2937", marginBottom: "4px" }}>Claude analyse la facture…</div>
        <div style={{ fontSize: "13px", color: "#9CA3AF" }}>
          {fileName && <span style={{ color: "#6B7280" }}>📄 {fileName} · </span>}
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
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", background: done ? "#16A34A" : active ? "#EFF6FF" : "#F9FAFB", border: `2px solid ${done ? "#16A34A" : active ? "#1D4ED8" : "#E5E7EB"}`, transition: "all 0.3s" }}>
                {done ? "✓" : s.icon}
              </div>
              <span style={{ fontSize: "14px", fontWeight: active ? "700" : done ? "500" : "400", color: done ? "#16A34A" : active ? "#1F2937" : "#9CA3AF", animation: active ? "fc-pulse 1.5s ease-in-out infinite" : undefined, transition: "all 0.3s" }}>
                {s.label}{active && <span style={{ marginLeft: "6px", color: "#1D4ED8" }}>…</span>}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: "20px", textAlign: "center", fontSize: "12px", color: "#D1D5DB" }}>15 à 30 secondes selon la taille de la facture</div>
    </div>
  );
}

interface Supplier {
  id: string;
  name: string;
  nom_commercial?: string;
  invoice_price_column?: string | null;
}

type Status = "idle" | "extracting" | "column_selection" | "error";

export default function NouvelleFactureForm({
  suppliers,
  initialSupplierId = null,
  releveId = null,
}: {
  suppliers: Supplier[];
  initialSupplierId?: string | null;
  releveId?: string | null;
}) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState<string | null>(initialSupplierId);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [errorRaw, setErrorRaw] = useState("");
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [savingColumn, setSavingColumn] = useState(false);
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [pendingInvoiceId, setPendingInvoiceId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);
  const supplierName = selectedSupplier?.nom_commercial || selectedSupplier?.name || "";
  const currentInvoicePriceColumn = selectedSupplier?.invoice_price_column ?? null;

  // Nettoyage object URL à la destruction
  useEffect(() => {
    return () => { if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl); };
  }, [pdfObjectUrl]);

  const isValidFile = (f: File) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");

  const doExtract = useCallback(async (targetFile: File, targetSupplierId: string) => {
    const sup = suppliers.find((s) => s.id === targetSupplierId);
    const supName = sup?.nom_commercial || sup?.name || "";
    const supInvoiceColumn = sup?.invoice_price_column ?? null;

    setStatus("extracting");
    setErrorMsg("");
    setErrorRaw("");

    const fd = new FormData();
    fd.append("pdf", targetFile);
    fd.append("supplier_id", targetSupplierId);
    fd.append("supplier_name", supName);
    if (supInvoiceColumn) fd.append("invoice_price_column", supInvoiceColumn);
    if (releveId) fd.append("releve_id", releveId);

    try {
      const res = await fetch("/api/extract-facture", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Erreur inconnue");
        setErrorRaw(data.raw ?? "");
        setStatus("error");
        return;
      }

      const cols: string[] = Array.isArray(data.colonnes_prix) ? data.colonnes_prix : [];

      // Première fois pour ce fournisseur → sélecteur de colonne
      if (!supInvoiceColumn && cols.length > 0) {
        const url = URL.createObjectURL(targetFile);
        setPdfObjectUrl(url);
        setDetectedColumns(cols);
        setSelectedColumn(cols[0] ?? "");
        setPendingInvoiceId(data.invoice_id);
        setStatus("column_selection");
        return;
      }

      if (releveId) {
        await fetch("/api/recheck-releve", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ releve_id: releveId }),
        });
        router.push(`/releves/${releveId}?success=importe`);
      } else {
        router.push(`/factures/${data.invoice_id}?success=1`);
      }
    } catch (e) {
      setErrorMsg(String(e));
      setStatus("error");
    }
  }, [suppliers, router, releveId]);

  const handleFile = useCallback((f: File) => {
    if (!isValidFile(f)) { setErrorMsg("Seuls les fichiers PDF sont acceptés."); setStatus("error"); return; }
    if (!supplierId) return;
    setFile(f);
    setStatus("idle");
    setErrorMsg("");
    setErrorRaw("");
    doExtract(f, supplierId);
  }, [supplierId, doExtract]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleValidateColumn = async () => {
    if (!selectedColumn || !supplierId || !pendingInvoiceId) return;
    setSavingColumn(true);
    try {
      await saveInvoicePriceColumnAction(supplierId, selectedColumn);
      if (releveId) {
        await fetch("/api/recheck-releve", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ releve_id: releveId }),
        });
        router.push(`/releves/${releveId}?success=importe`);
      } else {
        router.push(`/factures/${pendingInvoiceId}?success=1`);
      }
    } catch {
      setSavingColumn(false);
    }
  };

  // — VUE SÉLECTEUR DE COLONNE (plein écran overlay) —
  if (status === "column_selection") {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#F1F5F9", display: "flex", flexDirection: "column" }}>
        <style>{`@keyframes fc-fadein { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }`}</style>

        {/* Barre du haut */}
        <div style={{ background: "#1E40AF", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ background: "#1D4ED8", border: "2px solid rgba(255,255,255,0.3)", borderRadius: "8px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>📋</div>
            <div>
              <div style={{ color: "white", fontWeight: "800", fontSize: "15px" }}>Choisir la colonne de prix facturé</div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px" }}>{supplierName} · {file?.name}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              onClick={() => { router.push(`/factures/${pendingInvoiceId}?success=1`); }}
              style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", padding: "8px 16px", fontSize: "13px", cursor: "pointer" }}
            >
              Passer →
            </button>
            <button
              onClick={handleValidateColumn}
              disabled={!selectedColumn || savingColumn}
              style={{ background: "#E85A00", color: "white", border: "none", borderRadius: "8px", padding: "10px 24px", fontSize: "14px", fontWeight: "700", cursor: selectedColumn && !savingColumn ? "pointer" : "not-allowed", opacity: !selectedColumn || savingColumn ? 0.6 : 1 }}
            >
              {savingColumn ? "Enregistrement…" : "✓ Valider"}
            </button>
          </div>
        </div>

        {/* Corps : gauche = PDF, droite = sélecteur */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* Gauche : aperçu de la facture */}
          <div style={{ flex: 1, background: "#E2E8F0", display: "flex", flexDirection: "column", borderRight: "2px solid #CBD5E1" }}>
            {pdfObjectUrl ? (
              <iframe
                src={pdfObjectUrl}
                style={{ flex: 1, border: "none", width: "100%", height: "100%" }}
                title="Aperçu de la facture"
              />
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontSize: "48px" }}>📄</div>
              </div>
            )}
          </div>

          {/* Droite : sélecteur */}
          <div style={{ width: "380px", flexShrink: 0, background: "white", display: "flex", flexDirection: "column", padding: "28px 24px", gap: "24px", overflowY: "auto", animation: "fc-fadein 0.3s ease" }}>

            {/* Titre */}
            <div>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "#1F2937", marginBottom: "8px" }}>
                Quelle est la colonne du prix facturé ?
              </div>
              <div style={{ fontSize: "13px", color: "#6B7280", lineHeight: 1.6 }}>
                Cette colonne sera comparée au tarif de référence pour détecter les écarts de prix.
                Regardez la facture à gauche et choisissez la bonne colonne.
              </div>
            </div>

            {/* Colonnes détectées */}
            <div>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
                Colonnes détectées ({detectedColumns.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {detectedColumns.map((col) => {
                  const selected = col === selectedColumn;
                  return (
                    <button
                      key={col}
                      onClick={() => setSelectedColumn(col)}
                      style={{
                        display: "flex", alignItems: "center", gap: "12px",
                        padding: "14px 16px", borderRadius: "10px",
                        border: `2px solid ${selected ? "#1D4ED8" : "#E5E7EB"}`,
                        background: selected ? "#EFF6FF" : "white",
                        cursor: "pointer", textAlign: "left",
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: `2px solid ${selected ? "#1D4ED8" : "#D1D5DB"}`, background: selected ? "#1D4ED8" : "white", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {selected && <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "white" }} />}
                      </div>
                      <span style={{ fontSize: "14px", fontWeight: selected ? "700" : "500", color: selected ? "#1D4ED8" : "#374151", fontFamily: "monospace" }}>
                        {col}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Colonne sélectionnée */}
            {selectedColumn && (
              <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "10px", padding: "14px 16px" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#1D4ED8", textTransform: "uppercase", marginBottom: "4px" }}>Colonne choisie</div>
                <div style={{ fontSize: "15px", fontWeight: "800", color: "#1E40AF", fontFamily: "monospace" }}>{selectedColumn}</div>
              </div>
            )}

            {/* Info */}
            <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: "8px", padding: "12px 14px", fontSize: "12px", color: "#16A34A", lineHeight: 1.6 }}>
              💡 Ce réglage est sauvegardé pour ce fournisseur. Les prochaines factures seront contrôlées sur cette colonne automatiquement.
            </div>
          </div>
        </div>
      </div>
    );
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
                  transition: "all 0.15s ease",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
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
                {s.invoice_price_column && (
                  <div style={{ marginTop: "6px", fontSize: "10px", color: "#16A34A", background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: "4px", padding: "2px 6px", fontFamily: "monospace" }}>
                    ✓ {s.invoice_price_column}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // — ÉTAPE 2 : Dépôt du PDF —
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Fournisseur sélectionné + bouton changer */}
      {status !== "extracting" && (
        <div style={{ background: "white", borderRadius: "12px", padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", background: "#1D4ED8", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>🏢</div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: "700", color: "#1F2937" }}>{supplierName}</div>
              <div style={{ fontSize: "12px", color: currentInvoicePriceColumn ? "#16A34A" : "#9CA3AF" }}>
                {currentInvoicePriceColumn
                  ? `✓ Colonne : ${currentInvoicePriceColumn}`
                  : "Colonne de prix à configurer"}
              </div>
            </div>
          </div>
          <button
            onClick={() => { setSupplierId(null); setFile(null); setStatus("idle"); setErrorMsg(""); setErrorRaw(""); }}
            style={{ fontSize: "13px", fontWeight: "600", color: "#6B7280", background: "#F3F4F6", border: "none", borderRadius: "6px", padding: "6px 12px", cursor: "pointer" }}
          >
            Changer
          </button>
        </div>
      )}

      {/* Zone drag-and-drop */}
      {status !== "extracting" && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? "#1D4ED8" : file ? "#16A34A" : "#D1D5DB"}`,
            borderRadius: "16px", padding: "56px 32px", textAlign: "center", cursor: "pointer",
            background: isDragging ? "#EFF6FF" : file ? "#F0FDF4" : "white",
            transition: "all 0.15s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          {!file ? (
            <>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>📄</div>
              <div style={{ fontSize: "16px", fontWeight: "700", color: "#1F2937", marginBottom: "8px" }}>Glissez la facture PDF ici</div>
              <div style={{ fontSize: "13px", color: "#9CA3AF" }}>ou cliquez pour parcourir</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>✅</div>
              <div style={{ fontSize: "15px", fontWeight: "700", color: "#16A34A", marginBottom: "4px" }}>{file.name}</div>
              <div style={{ fontSize: "13px", color: "#6B7280" }}>{(file.size / 1024).toFixed(0)} Ko · Cliquez pour changer</div>
            </>
          )}
        </div>
      )}

      {/* Erreur */}
      {status === "error" && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: "8px", padding: "14px 16px", color: "#DC2626", fontSize: "14px" }}>
          <div style={{ fontWeight: "700", marginBottom: errorRaw ? "10px" : 0 }}>⚠️ {errorMsg}</div>
          {errorRaw && (
            <details style={{ marginTop: "8px" }}>
              <summary style={{ fontSize: "12px", color: "#9B1C1C", cursor: "pointer", userSelect: "none" }}>
                Réponse brute de Claude (diagnostic)
              </summary>
              <pre style={{ marginTop: "8px", fontSize: "11px", color: "#7F1D1D", background: "#FEE2E2", padding: "10px", borderRadius: "6px", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                {errorRaw}
              </pre>
            </details>
          )}
        </div>
      )}

      {/* Extraction en cours */}
      {status === "extracting" && (
        <ExtractingLoader supplierName={supplierName} fileName={file?.name ?? ""} />
      )}
    </div>
  );
}
