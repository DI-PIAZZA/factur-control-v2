"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { savePriceColumnAction } from "../actions";

const steps = [
  { label: "Lecture du PDF", icon: "📄" },
  { label: "Identification du fournisseur", icon: "🔍" },
  { label: "Extraction des lignes", icon: "⚡" },
  { label: "Vérification & nettoyage", icon: "✅" },
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
      let cumul = 0;
      for (let i = 0; i < durations.length; i++) {
        cumul += durations[i];
        if (elapsed < cumul) { setCurrentStep(i); break; }
        setCurrentStep(durations.length - 1);
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ background: "white", borderRadius: "16px", padding: "36px 32px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
      <style>{`
        @keyframes fc-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fc-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "56px", height: "56px", background: "#FFF7ED", borderRadius: "50%", marginBottom: "16px" }}>
          <div style={{ width: "28px", height: "28px", border: "3px solid #E85A00", borderTopColor: "transparent", borderRadius: "50%", animation: "fc-spin 0.8s linear infinite" }} />
        </div>
        <div style={{ fontSize: "17px", fontWeight: "800", color: "#1F2937", marginBottom: "4px" }}>Claude analyse votre PDF…</div>
        <div style={{ fontSize: "13px", color: "#9CA3AF" }}>
          {fileName && <span style={{ color: "#6B7280" }}>📄 {fileName} · </span>}
          {supplierName}
        </div>
      </div>
      <div style={{ background: "#F3F4F6", borderRadius: "8px", height: "8px", marginBottom: "28px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #E85A00, #F97316)", borderRadius: "8px", transition: "width 0.3s ease" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {steps.map((s, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", background: done ? "#16A34A" : active ? "#FFF7ED" : "#F9FAFB", border: `2px solid ${done ? "#16A34A" : active ? "#E85A00" : "#E5E7EB"}`, transition: "all 0.3s" }}>
                {done ? "✓" : s.icon}
              </div>
              <span style={{ fontSize: "14px", fontWeight: active ? "700" : done ? "500" : "400", color: done ? "#16A34A" : active ? "#1F2937" : "#9CA3AF", animation: active ? "fc-pulse 1.5s ease-in-out infinite" : undefined, transition: "all 0.3s" }}>
                {s.label}{active && <span style={{ marginLeft: "6px", color: "#E85A00" }}>…</span>}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: "20px", textAlign: "center", fontSize: "12px", color: "#D1D5DB" }}>15 à 30 secondes selon la taille du PDF</div>
    </div>
  );
}

interface ExtractedLine { ref_article: string; label: string; unit_price: number; unit: string; }
type Status = "idle" | "extracting" | "coherence_alert" | "column_selection" | "error";

interface Props {
  supplierId: string;
  supplierName: string;
  currentPriceColumn: string | null;
  currentCostColumn?: string | null;
}

export default function ExtractTarifForm({ supplierId, supplierName, currentPriceColumn, currentCostColumn }: Props) {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [lines, setLines] = useState<ExtractedLine[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [fournisseurDetecte, setFournisseurDetecte] = useState("");
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [selectedCostColumns, setSelectedCostColumns] = useState<string[]>(
    currentCostColumn ? currentCostColumn.split(",").filter(Boolean) : []
  );
  const [savingColumn, setSavingColumn] = useState(false);
  const [isExcelFile, setIsExcelFile] = useState(false);
  const [errorRaw, setErrorRaw] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Nettoyage object URL à la destruction
  useEffect(() => {
    return () => { if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl); };
  }, [pdfObjectUrl]);

  const isValidFile = (f: File) => {
    const name = f.name.toLowerCase();
    return f.type === "application/pdf" || name.endsWith(".pdf") || name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".xlsm");
  };

  const handleFile = useCallback((f: File) => {
    if (!isValidFile(f)) { setErrorMsg("Seuls les fichiers PDF ou Excel (.xlsx, .xls) sont acceptés."); setStatus("error"); return; }
    setFile(f);
    setStatus("idle");
    setErrorMsg("");
    const excel = f.name.toLowerCase().match(/\.(xlsx|xls|xlsm)$/);
    setIsExcelFile(!!excel);
    doExtractWithFile(f, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId, supplierName]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const doExtractWithFile = async (targetFile: File, forceInsert: boolean) => {
    setStatus("extracting");
    setErrorMsg("");

    const formData = new FormData();
    formData.append("pdf", targetFile);
    formData.append("supplier_id", supplierId);
    formData.append("supplier_name", supplierName);
    if (forceInsert) formData.append("force_insert", "true");

    try {
      const res = await fetch("/api/extract-tarif", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Erreur inconnue");
        setErrorRaw(data.raw ?? "");
        setStatus("error");
        return;
      }

      const cols: string[] = Array.isArray(data.colonnes_prix) ? data.colonnes_prix : [];

      if (data.coherence_alert) {
        setFournisseurDetecte(data.fournisseur_detecte ?? "inconnu");
        setLines(data.lines ?? []);
        setDetectedColumns(cols);
        setStatus("coherence_alert");
        return;
      }

      // Extraction réussie → toujours ouvrir le sélecteur de colonnes
      if (cols.length > 0) {
        // Créer l'URL d'aperçu PDF (seulement pour les PDF, pas Excel)
        const excel = targetFile.name.toLowerCase().match(/\.(xlsx|xls|xlsm)$/);
        if (!excel) {
          const url = URL.createObjectURL(targetFile);
          setPdfObjectUrl(url);
        }
        setDetectedColumns(cols);
        // Pré-sélectionner la colonne existante si elle est dans les colonnes détectées
        const preselect = currentPriceColumn && cols.includes(currentPriceColumn)
          ? currentPriceColumn
          : (cols[0] ?? "");
        setSelectedColumn(preselect);
        setStatus("column_selection");
        return;
      }

      router.push(`/fournisseurs/${supplierId}?success=1`);
    } catch (e) {
      setErrorMsg(String(e));
      setStatus("error");
    }
  };

  const doExtract = (forceInsert: boolean) => { if (!file) return; doExtractWithFile(file, forceInsert); };
  const handleReset = () => { setFile(null); setStatus("idle"); setLines([]); setFournisseurDetecte(""); setErrorRaw(""); };

  const handleValidateColumn = async () => {
    if (!selectedColumn) return;
    setSavingColumn(true);
    try {
      await savePriceColumnAction(supplierId, selectedColumn);

      // Si des colonnes de coût sont sélectionnées, lancer l'extraction ciblée
      if (selectedCostColumns.length > 0 && file) {
        setStatus("extracting");
        setSavingColumn(false);
        const costFormData = new FormData();
        costFormData.append("pdf", file);
        costFormData.append("supplier_id", supplierId);
        costFormData.append("cost_columns", selectedCostColumns.join(","));
        try {
          await fetch("/api/extract-cost-column", { method: "POST", body: costFormData });
          // Erreur non bloquante — on redirige quoi qu'il arrive
        } catch {
          // Silencieux
        }
      }

      router.push(`/fournisseurs/${supplierId}?success=1`);
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
            <div style={{ background: "#E85A00", borderRadius: "8px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>📊</div>
            <div>
              <div style={{ color: "white", fontWeight: "800", fontSize: "15px" }}>Choisir la colonne de contrôle</div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px" }}>{supplierName} · {file?.name}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              onClick={() => { router.push(`/fournisseurs/${supplierId}?success=1`); }}
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

          {/* Gauche : aperçu du document */}
          <div style={{ flex: 1, background: "#E2E8F0", display: "flex", flexDirection: "column", borderRight: "2px solid #CBD5E1" }}>
            {!isExcelFile && pdfObjectUrl ? (
              <iframe
                src={pdfObjectUrl}
                style={{ flex: 1, border: "none", width: "100%", height: "100%" }}
                title="Aperçu du tarif"
              />
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", padding: "32px" }}>
                <div style={{ fontSize: "64px" }}>📊</div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "#475569" }}>Fichier Excel</div>
                <div style={{ fontSize: "13px", color: "#94A3B8", textAlign: "center", maxWidth: "320px" }}>
                  L&apos;aperçu n&apos;est pas disponible pour les fichiers Excel.<br />
                  Référez-vous à votre document pour identifier la bonne colonne.
                </div>
                <div style={{ background: "white", borderRadius: "10px", padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#6B7280", textTransform: "uppercase", marginBottom: "8px" }}>Fichier</div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#1F2937" }}>📄 {file?.name}</div>
                </div>
              </div>
            )}
          </div>

          {/* Droite : sélecteur */}
          <div style={{ width: "380px", flexShrink: 0, background: "white", display: "flex", flexDirection: "column", padding: "28px 24px", gap: "24px", overflowY: "auto", animation: "fc-fadein 0.3s ease" }}>

            {/* Titre */}
            <div>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "#1F2937", marginBottom: "8px" }}>
                Quelle est la colonne de prix de référence ?
              </div>
              <div style={{ fontSize: "13px", color: "#6B7280", lineHeight: 1.6 }}>
                Cette colonne du tarif sera comparée au prix facturé pour détecter les écarts.
                Regardez le document à gauche et choisissez la bonne colonne.
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
              <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: "10px", padding: "14px 16px" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#16A34A", textTransform: "uppercase", marginBottom: "4px" }}>Colonne choisie</div>
                <div style={{ fontSize: "15px", fontWeight: "800", color: "#15803D", fontFamily: "monospace" }}>{selectedColumn}</div>
              </div>
            )}

            {/* ─── Séparateur colonne de coût ─── */}
            <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: "20px" }}>
              <div style={{ fontSize: "14px", fontWeight: "800", color: "#1F2937", marginBottom: "6px" }}>
                Colonne de coût additionnel
                <span style={{ marginLeft: "8px", fontSize: "11px", fontWeight: "600", color: "#9CA3AF", background: "#F3F4F6", padding: "2px 8px", borderRadius: "10px" }}>optionnel</span>
              </div>
              <div style={{ fontSize: "12px", color: "#6B7280", lineHeight: 1.6, marginBottom: "12px" }}>
                Droits d&apos;alcool, taxes d&apos;assise ou tout montant à ajouter pour calculer le <strong>prix de revient HT</strong>.
                Laissez vide si non applicable.
              </div>

              {/* Colonnes de coût — multi-sélection (cases à cocher) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {detectedColumns.map((col) => {
                  if (col === selectedColumn) return null; // masquer la colonne principale
                  const checked = selectedCostColumns.includes(col);
                  return (
                    <button
                      key={col}
                      onClick={() => setSelectedCostColumns(prev =>
                        prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
                      )}
                      style={{
                        display: "flex", alignItems: "center", gap: "12px",
                        padding: "11px 14px", borderRadius: "10px",
                        border: `2px solid ${checked ? "#D97706" : "#E5E7EB"}`,
                        background: checked ? "#FFFBEB" : "white",
                        cursor: "pointer", textAlign: "left",
                      }}
                    >
                      {/* Case à cocher carrée */}
                      <div style={{
                        width: "18px", height: "18px", borderRadius: "4px",
                        border: `2px solid ${checked ? "#D97706" : "#D1D5DB"}`,
                        background: checked ? "#D97706" : "white",
                        flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {checked && <span style={{ color: "white", fontSize: "11px", fontWeight: "900", lineHeight: 1 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: "13px", fontWeight: checked ? "700" : "500", color: checked ? "#92400E" : "#374151", fontFamily: "monospace" }}>
                        {col}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Aperçu formule */}
              {selectedCostColumns.length > 0 && (
                <div style={{ marginTop: "10px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "10px", padding: "12px 14px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#D97706", textTransform: "uppercase", marginBottom: "4px" }}>
                    {selectedCostColumns.length > 1 ? "Colonnes de coût sélectionnées" : "Colonne de coût sélectionnée"}
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: "800", color: "#92400E", fontFamily: "monospace", marginBottom: "4px" }}>
                    {selectedCostColumns.join(" + ")}
                  </div>
                  <div style={{ fontSize: "11px", color: "#D97706" }}>
                    Prix de revient HT = {selectedColumn || "Prix net"} + {selectedCostColumns.join(" + ")}
                  </div>
                </div>
              )}
            </div>

            {/* Info */}
            <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "8px", padding: "12px 14px", fontSize: "12px", color: "#1D4ED8", lineHeight: 1.6 }}>
              💡 Ces réglages sont sauvegardés pour ce fournisseur. Vous pourrez les modifier depuis sa fiche.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* Zone drag-and-drop */}
      {status !== "extracting" && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? "#E85A00" : file ? "#16A34A" : "#D1D5DB"}`,
            borderRadius: "16px", padding: "56px 32px", textAlign: "center", cursor: "pointer",
            background: isDragging ? "#FFF7ED" : file ? "#F0FDF4" : "white",
            transition: "all 0.15s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <input ref={fileInputRef} type="file" accept=".pdf,.xlsx,.xls,.xlsm,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          {!file ? (
            <>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>📄</div>
              <div style={{ fontSize: "16px", fontWeight: "700", color: "#1F2937", marginBottom: "8px" }}>Glissez le PDF du tarif ici</div>
              <div style={{ fontSize: "13px", color: "#9CA3AF" }}>ou cliquez pour parcourir · PDF ou Excel (.xlsx)</div>
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

      {/* ⚠️ ALERTE COHÉRENCE */}
      {status === "coherence_alert" && (
        <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <div style={{ background: "#FFF7ED", borderBottom: "2px solid #E85A00", padding: "20px 24px" }}>
            <div style={{ fontSize: "24px", marginBottom: "10px" }}>⚠️</div>
            <h3 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: "800", color: "#1F2937" }}>
              Ce PDF ne semble pas être le tarif de {supplierName}
            </h3>
            <p style={{ margin: 0, fontSize: "14px", color: "#6B7280" }}>
              L&apos;IA a détecté que ce document provient de :{" "}
              <strong style={{ color: "#E85A00" }}>{fournisseurDetecte}</strong>
              <br />
              {lines.length} ligne{lines.length > 1 ? "s" : ""} extraite{lines.length > 1 ? "s" : ""}. Voulez-vous quand même l&apos;enregistrer ?
            </p>
          </div>
          <div style={{ padding: "20px 24px", display: "flex", gap: "12px" }}>
            <button onClick={() => doExtract(true)} style={{ background: "#E85A00", color: "white", padding: "12px 24px", borderRadius: "8px", fontSize: "14px", fontWeight: "700", border: "none", cursor: "pointer" }}>
              Oui, enregistrer quand même
            </button>
            <button onClick={handleReset} style={{ background: "#F3F4F6", color: "#374151", padding: "12px 24px", borderRadius: "8px", fontSize: "14px", fontWeight: "600", border: "none", cursor: "pointer" }}>
              Non, changer de PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
