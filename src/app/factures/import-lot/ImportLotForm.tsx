"use client";

import { useState, useRef, useEffect } from "react";
import ProcessingLoader from "./ProcessingLoader";
import AnalysisLoader from "./AnalysisLoader";

// ─── Types ────────────────────────────────────────────────────────────────────

type Statut = "pret" | "sans_colonne" | "sans_tarif" | "nouveau_fournisseur" | "erreur";

interface ResultatAnalyse {
  nom_fichier: string;
  fournisseur_detecte?: string;
  siret_detecte?: string;
  numero_facture?: string;
  date_facture?: string;
  colonnes_prix?: string[];
  preview_b64?: string;
  fournisseur_match?: {
    id: string;
    name: string;
    siret: string | null;
    price_column: string | null;
  } | null;
  a_tarif?: boolean;
  statut: Statut | "erreur";
  erreur?: string;
}

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

type Etape = "select" | "analysing" | "config" | "preflight" | "processing" | "done";

interface ConfigNouveau {
  cle: string;           // siret ou nom détecté (clé unique)
  nom: string;
  siret: string | null;
  statut: "nouveau_fournisseur" | "sans_tarif";
  supplier_id: string | null;
  nb_factures: number;
  colonnes_disponibles: string[];  // colonnes prix détectées dans les factures
}

// ─── Couleurs & badges ────────────────────────────────────────────────────────

const BADGE: Record<Statut, { label: string; bg: string; color: string; border: string; icon: string }> = {
  pret:              { label: "Prêt",              bg: "#F0FDF4", color: "#16A34A", border: "#86EFAC", icon: "✅" },
  sans_colonne:      { label: "Colonne manquante", bg: "#FEF3C7", color: "#92400E", border: "#FCD34D", icon: "🟡" },
  sans_tarif:        { label: "Sans tarif",        bg: "#FEF9C3", color: "#B45309", border: "#FDE68A", icon: "⚠️" },
  nouveau_fournisseur:{ label: "Nouveau fournisseur",bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE", icon: "🆕" },
  erreur:            { label: "Erreur",            bg: "#FEF2F2", color: "#DC2626", border: "#FECACA", icon: "❌" },
};

// ─── Composant ────────────────────────────────────────────────────────────────

export default function ImportLotForm() {
  const [etape, setEtape] = useState<Etape>("select");
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [modeSelection, setModeSelection] = useState<"multiple" | "dossier" | "zip">("multiple");

  const [resultatsAnalyse, setResultatsAnalyse] = useState<ResultatAnalyse[]>([]);
  const [colonnesConfig, setColonnesConfig] = useState<Record<string, string>>({}); // nom_fichier → colonne choisie
  const [resultatsProcess, setResultatsProcess] = useState<ResultatProcess[]>([]);
  const [erreurGlobale, setErreurGlobale] = useState<string | null>(null);
  const [progression, setProgression] = useState<string>("");
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);
  const [confirmSuppression, setConfirmSuppression] = useState(false);
  // Étape "config" — nouveaux fournisseurs / sans tarif
  const [configNouveaux, setConfigNouveaux] = useState<ConfigNouveau[]>([]);
  const [colonnesNouveaux, setColonnesNouveaux] = useState<Record<string, string>>({}); // cle → colonne
  const [pdfPreviewUrls, setPdfPreviewUrls] = useState<Record<string, string>>({}); // cle → object URL
  const [configActifIndex, setConfigActifIndex] = useState(0); // index du fournisseur actif dans l'écran config

  // Nettoyage des object URLs à la destruction
  useEffect(() => {
    return () => {
      Object.values(pdfPreviewUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inputRef       = useRef<HTMLInputElement>(null);
  const inputDossierRef = useRef<HTMLInputElement>(null);
  const inputZipRef    = useRef<HTMLInputElement>(null);

  // ── Sauvegarde/restauration de l'état en sessionStorage ──
  useEffect(() => {
    // Restaurer l'état au montage
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("import-lot-state");
      if (saved) {
        try {
          const state = JSON.parse(saved);
          setEtape(state.etape);
          setResultatsAnalyse(state.resultatsAnalyse || []);
          setResultatsProcess(state.resultatsProcess || []);
          setColonnesConfig(state.colonnesConfig || {});
          setColonnesNouveaux(state.colonnesNouveaux || {});
          setConfigNouveaux(state.configNouveaux || []);
          setConfigActifIndex(state.configActifIndex || 0);
          setSelection(new Set(state.selection || []));
          setProgression(state.progression || "");
        } catch {
          // Ignorer si le state est corrompu
        }
      }
    }
  }, []);

  // Sauvegarder l'état en sessionStorage quand il change
  useEffect(() => {
    if (typeof window !== "undefined" && etape !== "select") {
      const state = {
        etape,
        resultatsAnalyse,
        resultatsProcess,
        colonnesConfig,
        colonnesNouveaux,
        configNouveaux,
        configActifIndex,
        selection: Array.from(selection),
        progression,
      };
      sessionStorage.setItem("import-lot-state", JSON.stringify(state));
    }
  }, [etape, resultatsAnalyse, resultatsProcess, colonnesConfig, colonnesNouveaux, configNouveaux, configActifIndex, selection, progression]);

  // ── Sélection fichiers ──────────────────────────────────────────────────────

  function onSelectFichiers(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files).filter(
      (f) => f.name.toLowerCase().endsWith(".pdf") || f.name.toLowerCase().endsWith(".zip")
    );
    if (arr.length === 0) return;
    setFichiers(arr);
    setErreurGlobale(null);
    // Transition immédiate vers l'écran "analyse en cours"
    setEtape("analysing");
    setProgression(`Analyse de ${arr.length} fichier${arr.length > 1 ? "s" : ""} en cours…`);
    // Lancement asynchrone après le rendu
    setTimeout(() => lancerAnalyseAvec(arr), 0);
  }

  const nbPdfs = fichiers.filter((f) => f.name.toLowerCase().endsWith(".pdf")).length;
  const nbZips = fichiers.filter((f) => f.name.toLowerCase().endsWith(".zip")).length;

  // ── Analyse ─────────────────────────────────────────────────────────────────

  async function lancerAnalyse() {
    await lancerAnalyseAvec(fichiers);
  }

  async function lancerAnalyseAvec(liste: File[]) {
    if (liste.length === 0) return;

    try {
      const fd = new FormData();
      for (const f of liste) fd.append("fichiers", f);

      const res = await fetch("/api/import-lot/analyse", { method: "POST", body: fd });
      const json = await res.json();

      if (!res.ok) {
        setErreurGlobale(json.error ?? "Erreur serveur");
        setEtape("select");
        return;
      }

      const resultats: ResultatAnalyse[] = json.resultats ?? [];
      setResultatsAnalyse(resultats);

      // Pré-remplir colonnes connues
      const cfg: Record<string, string> = {};
      for (const r of resultats) {
        if (r.fournisseur_match?.price_column) cfg[r.nom_fichier] = r.fournisseur_match.price_column;
      }
      setColonnesConfig(cfg);

      // Détecter les nouveaux fournisseurs / sans tarif → besoin de configurer une colonne
      const nouveauxMap = new Map<string, ConfigNouveau>();
      for (const r of resultats) {
        if (r.statut === "nouveau_fournisseur" || r.statut === "sans_tarif") {
          const cle = r.siret_detecte || r.fournisseur_detecte || r.nom_fichier;
          if (!nouveauxMap.has(cle)) {
            nouveauxMap.set(cle, {
              cle,
              nom: r.fournisseur_match?.name || r.fournisseur_detecte || "Fournisseur inconnu",
              siret: r.siret_detecte || null,
              statut: r.statut as "nouveau_fournisseur" | "sans_tarif",
              supplier_id: r.fournisseur_match?.id || null,
              nb_factures: 0,
              colonnes_disponibles: [],
            });
          }
          const entry = nouveauxMap.get(cle)!;
          entry.nb_factures++;
          // Accumuler les colonnes prix détectées (sans doublons)
          for (const col of r.colonnes_prix ?? []) {
            if (!entry.colonnes_disponibles.includes(col)) {
              entry.colonnes_disponibles.push(col);
            }
          }
        }
      }

      if (nouveauxMap.size > 0) {
        const entries = Array.from(nouveauxMap.values());
        setConfigNouveaux(entries);
        setConfigActifIndex(0);
        // Créer les aperçus PDF depuis le base64 inclus dans la réponse d'analyse
        const urls: Record<string, string> = {};
        for (const entry of entries) {
          // Chercher le résultat qui a preview_b64 pour ce fournisseur
          const matchResult = resultats.find(
            (r) => r.preview_b64 &&
              (r.siret_detecte || r.fournisseur_detecte || r.nom_fichier) === entry.cle
          );
          if (matchResult?.preview_b64) {
            // Décoder base64 → Blob → object URL (tout en mémoire, pas de second upload)
            const bytes = Uint8Array.from(atob(matchResult.preview_b64), (c) => c.charCodeAt(0));
            const blob = new Blob([bytes], { type: "application/pdf" });
            urls[entry.cle] = URL.createObjectURL(blob);
          } else {
            // Fallback : fichier PDF direct (mode "plusieurs PDF")
            const matchNom = resultats.find(
              (r) => (r.siret_detecte || r.fournisseur_detecte || r.nom_fichier) === entry.cle
            )?.nom_fichier;
            const fichierDirect = matchNom
              ? liste.find((f) => f.name === matchNom && f.name.toLowerCase().endsWith(".pdf"))
              : null;
            if (fichierDirect) {
              urls[entry.cle] = URL.createObjectURL(fichierDirect);
            }
          }
        }
        setPdfPreviewUrls(urls);
        setEtape("config");
      } else {
        // Pas de nouveau fournisseur → aller au pré-vol pour vérifier avant traitement
        setEtape("preflight");
      }
    } catch (e) {
      setErreurGlobale(String(e));
      setEtape("select");
    }
  }

  // ── Depuis l'étape config (nouveau fournisseur) ──────────────────────────────

  async function validerConfig() {
    await _lancerTraitement(resultatsAnalyse, colonnesNouveaux);
  }

  // ── Traitement ───────────────────────────────────────────────────────────────

  async function _lancerTraitement(
    resultats: ResultatAnalyse[],
    colonnesNvx: Record<string, string>
  ) {
    setEtape("processing");
    setProgression("Traitement en cours… (environ 30 secondes par facture)");
    setErreurGlobale(null);

    // Résoudre la clé pour un résultat (siret ou nom détecté)
    function cleNouveauDe(r: ResultatAnalyse): string {
      return r.siret_detecte || r.fournisseur_detecte || r.nom_fichier;
    }

    const config = resultats
      .filter((r) => r.statut !== "erreur")
      .map((r) => {
        const besoinTarif = r.statut === "nouveau_fournisseur" || r.statut === "sans_tarif";
        const cle = cleNouveauDe(r);
        const colonne = besoinTarif
          ? (colonnesNvx[cle] ?? "")
          : (colonnesConfig[r.nom_fichier] ?? r.fournisseur_match?.price_column ?? r.colonnes_prix?.[0] ?? "");
        return {
          nom_fichier: r.nom_fichier,
          supplier_id: r.fournisseur_match?.id ?? "",
          price_column: colonne,
          invoice_price_column: colonne,
          creer_fournisseur: r.statut === "nouveau_fournisseur",
          nom_fournisseur: r.fournisseur_detecte ?? "",
          siret: r.siret_detecte ?? "",
          creer_tarif: besoinTarif,
          colonne_tarif: colonne,
        };
      });

    try {
      const fd = new FormData();
      fd.append("config", JSON.stringify(config));
      for (const f of fichiers) fd.append("fichiers", f);

      const res = await fetch("/api/import-lot/process", { method: "POST", body: fd });
      const json = await res.json();

      if (!res.ok) {
        setErreurGlobale(json.error ?? "Erreur serveur");
        setEtape(configNouveaux.length > 0 ? "config" : "select");
        return;
      }

      setResultatsProcess(json.resultats ?? []);
      setEtape("done");
    } catch (e) {
      setErreurGlobale(String(e));
      setEtape(configNouveaux.length > 0 ? "config" : "select");
    }
  }

  // ─── Rendu ──────────────────────────────────────────────────────────────────

  const nbPrets      = resultatsAnalyse.filter((r) => r.statut === "pret").length;
  const nbAttente    = resultatsAnalyse.filter((r) => ["sans_colonne", "sans_tarif", "nouveau_fournisseur"].includes(r.statut)).length;
  const nbErreurs    = resultatsAnalyse.filter((r) => r.statut === "erreur").length;

  const nbOk         = resultatsProcess.filter((r) => r.statut === "ok").length;
  const nbErrProcess = resultatsProcess.filter((r) => r.statut === "erreur").length;
  const totalEcarts  = resultatsProcess.filter((r) => (r.nb_alertes ?? 0) > 0).length;

  // IDs des factures importées avec succès
  const invoiceIdsOk = resultatsProcess
    .filter((r) => r.statut === "ok" && r.invoice_id)
    .map((r) => r.invoice_id!);

  function toggleSelection(id: string) {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toutSelectionner() {
    setSelection(new Set(invoiceIdsOk));
  }

  function toutDeselectionner() {
    setSelection(new Set());
  }

  async function supprimerSelection() {
    if (selection.size === 0) return;
    setSuppressionEnCours(true);
    setConfirmSuppression(false);
    try {
      const res = await fetch("/api/import-lot/supprimer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invoice_ids: Array.from(selection) }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErreurGlobale(json.error ?? "Erreur suppression");
      } else {
        // Retirer du tableau les lignes supprimées
        setResultatsProcess((prev) =>
          prev.map((r) =>
            r.invoice_id && selection.has(r.invoice_id)
              ? { ...r, statut: "ignoré" as const, invoice_id: undefined, raison: "Supprimée" }
              : r
          )
        );
        setSelection(new Set());
      }
    } finally {
      setSuppressionEnCours(false);
    }
  }

  return (
    <div style={{ maxWidth: "900px" }}>

      {/* ── ÉTAPE 1 : Sélection ── */}
      {etape === "select" && (
        <div style={{ background: "white", borderRadius: "12px", padding: "32px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <h2 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: "700", color: "#1F2937" }}>
            Importer des factures en lot
          </h2>
          <p style={{ margin: "0 0 28px", fontSize: "13px", color: "#6B7280" }}>
            Sélectionne tes factures PDF. L&apos;IA va les identifier automatiquement et les contrôler si le tarif est configuré.
          </p>

          {erreurGlobale && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "12px 16px", marginBottom: "20px", color: "#DC2626", fontSize: "13px" }}>
              ❌ {erreurGlobale}
            </div>
          )}

          {/* Modes de sélection */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
            {([
              { key: "multiple", label: "📄 Plusieurs PDF", desc: "Sélection multiple de fichiers" },
              { key: "dossier",  label: "📁 Un dossier",    desc: "Tous les PDF d'un répertoire" },
              { key: "zip",      label: "🗜️ Fichier ZIP",   desc: "Archive ZIP contenant des PDF" },
            ] as const).map((m) => (
              <button
                key={m.key}
                onClick={() => setModeSelection(m.key)}
                style={{
                  flex: 1, minWidth: "140px",
                  padding: "14px 12px", borderRadius: "10px", cursor: "pointer",
                  border: modeSelection === m.key ? "2px solid #1D4ED8" : "2px solid #E5E7EB",
                  background: modeSelection === m.key ? "#EFF6FF" : "white",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "15px", fontWeight: "700", color: modeSelection === m.key ? "#1D4ED8" : "#374151" }}>
                  {m.label}
                </div>
                <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "4px" }}>{m.desc}</div>
              </button>
            ))}
          </div>

          {/* Zone drop / sélection */}
          <div
            onClick={() => {
              if (modeSelection === "multiple") inputRef.current?.click();
              else if (modeSelection === "dossier") inputDossierRef.current?.click();
              else inputZipRef.current?.click();
            }}
            style={{
              border: "2px dashed #BFDBFE", borderRadius: "12px", padding: "40px",
              textAlign: "center", cursor: "pointer", background: "#F8FAFF",
              transition: "border-color 0.2s",
            }}
          >
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>
              {modeSelection === "zip" ? "🗜️" : modeSelection === "dossier" ? "📁" : "📄"}
            </div>
            <div style={{ fontSize: "15px", fontWeight: "600", color: "#1D4ED8", marginBottom: "4px" }}>
              {modeSelection === "zip"
                ? "Cliquer pour sélectionner le fichier ZIP"
                : modeSelection === "dossier"
                ? "Cliquer pour sélectionner un dossier"
                : "Cliquer pour sélectionner les PDF"}
            </div>
            <div style={{ fontSize: "12px", color: "#9CA3AF" }}>
              {modeSelection === "zip" ? "Un seul fichier .zip" : "Plusieurs fichiers .pdf"}
            </div>

            <input ref={inputRef} type="file" accept=".pdf" multiple style={{ display: "none" }}
              onChange={(e) => onSelectFichiers(e.target.files)} />
            <input ref={inputDossierRef} type="file" accept=".pdf" multiple style={{ display: "none" }}
              // @ts-expect-error — webkitdirectory est non standard mais supporté par tous les navigateurs modernes
              webkitdirectory=""
              onChange={(e) => onSelectFichiers(e.target.files)} />
            <input ref={inputZipRef} type="file" accept=".zip" style={{ display: "none" }}
              onChange={(e) => onSelectFichiers(e.target.files)} />
          </div>

          {/* Récapitulatif fichiers sélectionnés — l'analyse démarre automatiquement */}
          {fichiers.length > 0 && (
            <div style={{ marginTop: "16px", background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: "8px", padding: "12px 16px" }}>
              <span style={{ fontSize: "14px", fontWeight: "600", color: "#16A34A" }}>
                ✅ {nbPdfs > 0 ? `${nbPdfs} PDF` : ""}{nbPdfs > 0 && nbZips > 0 ? " + " : ""}{nbZips > 0 ? `${nbZips} ZIP` : ""} sélectionné{fichiers.length > 1 ? "s" : ""} — analyse en cours…
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── ÉTAPE 2 : Analyse en cours ── */}
      {etape === "analysing" && <AnalysisLoader progression={progression} />}

      {/* ── ÉTAPE 3 : Configuration nouveaux fournisseurs — overlay plein écran ── */}
      {etape === "config" && configNouveaux.length > 0 && (() => {
        const c = configNouveaux[configActifIndex];
        const pdfUrl = pdfPreviewUrls[c.cle] ?? null;
        const colonneChoisie = colonnesNouveaux[c.cle] ?? "";
        const tousRemplis = configNouveaux.every((cfg) => !!(colonnesNouveaux[cfg.cle]?.trim()));
        const estDernier = configActifIndex === configNouveaux.length - 1;

        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#F1F5F9", display: "flex", flexDirection: "column" }}>
            <style>{`@keyframes fc-fadein { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }`}</style>

            {/* Barre du haut */}
            <div style={{ background: "#1E40AF", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ background: "#E85A00", borderRadius: "8px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>📋</div>
                <div>
                  <div style={{ color: "white", fontWeight: "800", fontSize: "15px" }}>Choisir la colonne de contrôle</div>
                  <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px" }}>
                    {c.nom} · {c.nb_factures} facture{c.nb_factures > 1 ? "s" : ""}
                    {configNouveaux.length > 1 && <span style={{ marginLeft: "8px", background: "rgba(255,255,255,0.15)", padding: "1px 8px", borderRadius: "10px" }}>
                      {configActifIndex + 1} / {configNouveaux.length}
                    </span>}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button
                  onClick={() => { setEtape("select"); setConfigNouveaux([]); setColonnesNouveaux({}); }}
                  style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", padding: "8px 16px", fontSize: "13px", cursor: "pointer" }}
                >
                  ← Annuler
                </button>
                {!estDernier ? (
                  <button
                    onClick={() => setConfigActifIndex((i) => i + 1)}
                    disabled={!colonneChoisie.trim()}
                    style={{ background: colonneChoisie.trim() ? "#E85A00" : "rgba(255,255,255,0.2)", color: "white", border: "none", borderRadius: "8px", padding: "10px 24px", fontSize: "14px", fontWeight: "700", cursor: colonneChoisie.trim() ? "pointer" : "not-allowed" }}
                  >
                    Suivant → ({configActifIndex + 2}/{configNouveaux.length})
                  </button>
                ) : (
                  <button
                    onClick={validerConfig}
                    disabled={!tousRemplis}
                    style={{ background: tousRemplis ? "#E85A00" : "rgba(255,255,255,0.2)", color: "white", border: "none", borderRadius: "8px", padding: "10px 24px", fontSize: "14px", fontWeight: "700", cursor: tousRemplis ? "pointer" : "not-allowed" }}
                  >
                    🚀 Lancer l&apos;import
                  </button>
                )}
              </div>
            </div>

            {/* Corps : gauche = PDF, droite = sélecteur */}
            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

              {/* Gauche : aperçu facture */}
              <div style={{ flex: 1, background: "#E2E8F0", display: "flex", flexDirection: "column", borderRight: "2px solid #CBD5E1" }}>
                {pdfUrl ? (
                  <iframe
                    src={pdfUrl}
                    style={{ flex: 1, border: "none", width: "100%", height: "100%" }}
                    title="Aperçu de la facture"
                  />
                ) : (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", padding: "32px" }}>
                    <div style={{ fontSize: "64px" }}>📄</div>
                    <div style={{ fontSize: "14px", color: "#64748B", textAlign: "center" }}>Aperçu non disponible</div>
                  </div>
                )}
              </div>

              {/* Droite : sélecteur de colonne */}
              <div style={{ width: "380px", flexShrink: 0, background: "white", display: "flex", flexDirection: "column", padding: "28px 24px", gap: "20px", overflowY: "auto", animation: "fc-fadein 0.3s ease" }}>

                {/* Info fournisseur */}
                <div>
                  <span style={{
                    display: "inline-block", fontSize: "11px", fontWeight: "700", padding: "3px 10px", borderRadius: "12px", marginBottom: "8px",
                    background: c.statut === "nouveau_fournisseur" ? "#DBEAFE" : "#FEF3C7",
                    color: c.statut === "nouveau_fournisseur" ? "#1D4ED8" : "#92400E",
                  }}>
                    {c.statut === "nouveau_fournisseur" ? "🆕 Nouveau fournisseur" : "⚠️ Sans tarif"}
                  </span>
                  <div style={{ fontSize: "20px", fontWeight: "800", color: "#1F2937", marginBottom: "4px" }}>{c.nom}</div>
                  {c.siret && <div style={{ fontSize: "12px", color: "#9CA3AF", fontFamily: "monospace" }}>{c.siret}</div>}
                  <div style={{ fontSize: "13px", color: "#6B7280", marginTop: "8px", lineHeight: 1.5 }}>
                    Regarde la facture à gauche et choisis la colonne qui contient le <strong>prix unitaire de référence</strong>.
                    Un tarif sera créé automatiquement.
                  </div>
                </div>

                {erreurGlobale && (
                  <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "10px 14px", color: "#DC2626", fontSize: "12px" }}>
                    ❌ {erreurGlobale}
                  </div>
                )}

                {/* Colonnes détectées — radio buttons */}
                {c.colonnes_disponibles.length > 0 && (
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
                      Colonnes détectées ({c.colonnes_disponibles.length})
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {c.colonnes_disponibles.map((col) => {
                        const selected = colonneChoisie === col;
                        return (
                          <button
                            key={col}
                            type="button"
                            onClick={() => setColonnesNouveaux((prev) => ({ ...prev, [c.cle]: col }))}
                            style={{
                              display: "flex", alignItems: "center", gap: "12px",
                              padding: "14px 16px", borderRadius: "10px",
                              border: `2px solid ${selected ? "#1D4ED8" : "#E5E7EB"}`,
                              background: selected ? "#EFF6FF" : "white",
                              cursor: "pointer", textAlign: "left",
                              transition: "all 0.15s",
                            }}
                          >
                            <div style={{
                              width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
                              border: `2px solid ${selected ? "#1D4ED8" : "#D1D5DB"}`,
                              background: selected ? "#1D4ED8" : "white",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
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
                )}

                {/* Saisie manuelle */}
                <div>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                    {c.colonnes_disponibles.length > 0 ? "Ou saisir manuellement" : "Nom de la colonne *"}
                  </div>
                  <input
                    type="text"
                    placeholder="Ex : PU NET HT, Prix unitaire HT…"
                    value={colonneChoisie}
                    onChange={(e) => setColonnesNouveaux((prev) => ({ ...prev, [c.cle]: e.target.value }))}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      border: `1.5px solid ${colonneChoisie ? "#1D4ED8" : "#D1D5DB"}`,
                      borderRadius: "8px", padding: "10px 14px",
                      fontSize: "14px", outline: "none", fontFamily: "monospace",
                    }}
                  />
                </div>

                {/* Colonne choisie */}
                {colonneChoisie.trim() && (
                  <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: "10px", padding: "14px 16px" }}>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: "#16A34A", textTransform: "uppercase", marginBottom: "4px" }}>Colonne choisie</div>
                    <div style={{ fontSize: "15px", fontWeight: "800", color: "#15803D", fontFamily: "monospace" }}>{colonneChoisie}</div>
                  </div>
                )}

                {/* Info */}
                <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "8px", padding: "12px 14px", fontSize: "12px", color: "#1D4ED8", lineHeight: 1.6 }}>
                  💡 Cette colonne sera enregistrée comme référence pour ce fournisseur. Les factures seront comparées à ce tarif lors des prochains imports.
                </div>

                {/* Navigation multi-fournisseurs */}
                {configNouveaux.length > 1 && (
                  <div style={{ display: "flex", gap: "8px", justifyContent: "center", paddingTop: "4px" }}>
                    {configNouveaux.map((_, idx) => (
                      <div
                        key={idx}
                        style={{
                          width: "10px", height: "10px", borderRadius: "50%",
                          background: idx === configActifIndex ? "#1D4ED8" : colonnesNouveaux[configNouveaux[idx].cle] ? "#16A34A" : "#D1D5DB",
                          cursor: "pointer",
                          transition: "background 0.2s",
                        }}
                        onClick={() => setConfigActifIndex(idx)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── ÉTAPE 3b : Pré-vol (conservé pour usage futur) ── */}
      {etape === "preflight" && (
        <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
          {/* Barre d'action EN HAUT — STICKY */}
          <div style={{
            display: "flex", gap: "12px", justifyContent: "space-between", alignItems: "center",
            background: "white", borderBottom: "1px solid #E5E7EB", padding: "16px 24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)", position: "sticky", top: 0, zIndex: 10,
          }}>
            <button
              onClick={() => { setEtape("select"); setResultatsAnalyse([]); }}
              style={{
                background: "#F3F4F6", color: "#374151", border: "none",
                borderRadius: "8px", padding: "10px 20px", fontSize: "13px",
                fontWeight: "600", cursor: "pointer",
              }}
            >
              ← Modifier la sélection
            </button>
            <button
              onClick={() => _lancerTraitement(resultatsAnalyse, colonnesConfig)}
              disabled={nbErreurs === resultatsAnalyse.length}
              style={{
                background: nbErreurs === resultatsAnalyse.length ? "#9CA3AF" : "#E85A00",
                color: "white", border: "none", borderRadius: "8px",
                padding: "12px 28px", fontSize: "14px", fontWeight: "700",
                cursor: nbErreurs === resultatsAnalyse.length ? "not-allowed" : "pointer",
              }}
            >
              🚀 Confirmer l'import ({resultatsAnalyse.length} facture{resultatsAnalyse.length > 1 ? "s" : ""}) →
            </button>
          </div>

          {/* Contenu scrollable */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
            <div style={{ background: "white", borderRadius: "12px", padding: "24px 28px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: "20px" }}>
              <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: "700", color: "#1F2937" }}>
                Récapitulatif avant import
              </h2>
              <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#6B7280" }}>
                Vérifiez les factures détectées et leur statut avant de lancer le traitement.
              </p>

              {/* Compteurs */}
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }}>
                {[
                  { label: "Prêtes",    value: nbPrets,   bg: "#F0FDF4", color: "#16A34A" },
                  { label: "En attente",value: nbAttente,  bg: "#FEF3C7", color: "#92400E" },
                  { label: "Erreurs",   value: nbErreurs, bg: "#FEF2F2", color: "#DC2626" },
                ].map((c) => (
                  <div key={c.label} style={{
                    background: c.bg, borderRadius: "8px", padding: "10px 20px",
                    textAlign: "center", minWidth: "90px",
                  }}>
                    <div style={{ fontSize: "24px", fontWeight: "900", color: c.color }}>{c.value}</div>
                    <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>{c.label}</div>
                  </div>
                ))}
              </div>

              {erreurGlobale && (
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", color: "#DC2626", fontSize: "13px" }}>
                  ❌ {erreurGlobale}
                </div>
              )}
            </div>

            {/* Tableau préflight */}
            <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflow: "hidden", marginBottom: "20px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F9FAFB" }}>
                    {["Fichier", "Fournisseur détecté", "N° facture", "Date", "Statut", "Colonne de prix"].map((h) => (
                      <th key={h} style={{
                        textAlign: "left", padding: "10px 14px",
                        fontSize: "11px", color: "#6B7280", fontWeight: "700",
                        textTransform: "uppercase", letterSpacing: "0.04em",
                        borderBottom: "1px solid #E5E7EB", whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resultatsAnalyse.map((r, i) => {
                    const badge = BADGE[r.statut as Statut] ?? BADGE.erreur;
                    return (
                      <tr key={r.nom_fichier} style={{ background: i % 2 === 1 ? "#F9FAFB" : "white", borderBottom: "1px solid #F3F4F6" }}>
                        <td style={{ padding: "10px 14px", fontSize: "12px", fontFamily: "monospace", color: "#374151", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.nom_fichier}
                        </td>
                        <td style={{ padding: "10px 14px", fontSize: "13px", color: "#1F2937", fontWeight: "500" }}>
                          {r.fournisseur_match?.name ?? r.fournisseur_detecte ?? "—"}
                          {r.siret_detecte && (
                            <div style={{ fontSize: "11px", color: "#9CA3AF", fontFamily: "monospace" }}>{r.siret_detecte}</div>
                          )}
                        </td>
                        <td style={{ padding: "10px 14px", fontSize: "12px", fontFamily: "monospace", color: "#374151", whiteSpace: "nowrap" }}>
                          {r.numero_facture ?? "—"}
                        </td>
                        <td style={{ padding: "10px 14px", fontSize: "12px", color: "#6B7280", whiteSpace: "nowrap" }}>
                          {r.date_facture ? new Date(r.date_facture).toLocaleDateString("fr-FR") : "—"}
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{
                            display: "inline-block", fontSize: "11px", fontWeight: "700",
                            padding: "3px 10px", borderRadius: "20px",
                            background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
                            whiteSpace: "nowrap",
                          }}>
                            {badge.icon} {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          {r.statut === "sans_colonne" ? (
                            <input
                              type="text"
                              placeholder="Ex: PU NET HT"
                              value={colonnesConfig[r.nom_fichier] ?? ""}
                              onChange={(e) => setColonnesConfig((prev) => ({ ...prev, [r.nom_fichier]: e.target.value }))}
                              style={{
                                border: "1px solid #FCD34D", borderRadius: "6px",
                                padding: "4px 8px", fontSize: "12px", width: "140px",
                                outline: "none",
                              }}
                            />
                          ) : r.fournisseur_match?.price_column ? (
                            <span style={{ fontSize: "12px", color: "#374151", fontFamily: "monospace", background: "#F3F4F6", padding: "3px 8px", borderRadius: "4px" }}>
                              {r.fournisseur_match.price_column}
                            </span>
                          ) : (
                            <span style={{ fontSize: "12px", color: "#9CA3AF" }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Légende */}
            <div style={{ background: "white", borderRadius: "10px", padding: "16px 20px", marginBottom: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#6B7280", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Légende</div>
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                {Object.values(BADGE).map((b) => (
                  <span key={b.label} style={{ fontSize: "12px", color: b.color, background: b.bg, border: `1px solid ${b.border}`, padding: "3px 10px", borderRadius: "20px", fontWeight: "600" }}>
                    {b.icon} {b.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ÉTAPE 4 : Traitement en cours ── */}
      {etape === "processing" && (
        <ProcessingLoader progression={progression} />
      )}

      {/* ── ÉTAPE 5 : Résultats ── */}
      {etape === "done" && (
        <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
          {/* Barre d'action EN HAUT — STICKY */}
          <div style={{
            display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap",
            background: "white", borderBottom: "1px solid #E5E7EB", padding: "16px 24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)", position: "sticky", top: 0, zIndex: 10,
          }}>
            <a href="/factures" style={{
              display: "inline-block", background: "#1F2937", color: "white",
              textDecoration: "none", borderRadius: "8px", padding: "10px 20px",
              fontSize: "13px", fontWeight: "600",
            }}>
              ← Retour aux factures
            </a>
            <button
              onClick={() => {
                setEtape("select");
                setFichiers([]);
                setResultatsAnalyse([]);
                setResultatsProcess([]);
                if (typeof window !== "undefined") {
                  sessionStorage.removeItem("import-lot-state");
                }
              }}
              style={{
                background: "#E85A00", color: "white", border: "none",
                borderRadius: "8px", padding: "10px 20px", fontSize: "13px",
                fontWeight: "600", cursor: "pointer",
              }}
            >
              + Nouvel import
            </button>

            {/* Séparateur */}
            <div style={{ width: "1px", height: "24px", background: "#E5E7EB", margin: "0 8px" }} />

            {/* Barre sélection EN HAUT */}
            {invoiceIdsOk.length > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap",
                marginLeft: "auto",
              }}>
                <span style={{ fontSize: "13px", color: "#6B7280" }}>
                  {selection.size > 0
                    ? <strong style={{ color: "#DC2626" }}>{selection.size} sélectionnée{selection.size > 1 ? "s" : ""}</strong>
                    : `${invoiceIdsOk.length} importée${invoiceIdsOk.length > 1 ? "s" : ""}`}
                </span>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {selection.size < invoiceIdsOk.length ? (
                    <button onClick={toutSelectionner} style={{
                      background: "white", color: "#374151", border: "1px solid #D1D5DB",
                      borderRadius: "6px", padding: "5px 12px", fontSize: "12px",
                      fontWeight: "600", cursor: "pointer",
                    }}>
                      Tout sélectionner
                    </button>
                  ) : (
                    <button onClick={toutDeselectionner} style={{
                      background: "white", color: "#374151", border: "1px solid #D1D5DB",
                      borderRadius: "6px", padding: "5px 12px", fontSize: "12px",
                      fontWeight: "600", cursor: "pointer",
                    }}>
                      Tout désélectionner
                    </button>
                  )}
                  {selection.size > 0 && !confirmSuppression && (
                    <button
                      onClick={() => setConfirmSuppression(true)}
                      style={{
                        background: "#DC2626", color: "white", border: "none",
                        borderRadius: "6px", padding: "5px 14px", fontSize: "12px",
                        fontWeight: "700", cursor: "pointer",
                      }}
                    >
                      🗑 Supprimer ({selection.size})
                    </button>
                  )}
                  {confirmSuppression && (
                    <>
                      <span style={{ fontSize: "12px", color: "#DC2626", fontWeight: "600", alignSelf: "center" }}>
                        Confirmer ?
                      </span>
                      <button
                        onClick={supprimerSelection}
                        disabled={suppressionEnCours}
                        style={{
                          background: "#DC2626", color: "white", border: "none",
                          borderRadius: "6px", padding: "5px 14px", fontSize: "12px",
                          fontWeight: "700", cursor: suppressionEnCours ? "not-allowed" : "pointer",
                          opacity: suppressionEnCours ? 0.6 : 1,
                        }}
                      >
                        {suppressionEnCours ? "…" : "✓ Oui"}
                      </button>
                      <button
                        onClick={() => setConfirmSuppression(false)}
                        style={{
                          background: "#F3F4F6", color: "#374151", border: "none",
                          borderRadius: "6px", padding: "5px 12px", fontSize: "12px",
                          fontWeight: "600", cursor: "pointer",
                        }}
                      >
                        Annuler
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Contenu scrollable */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
            {/* Bilan */}
            <div style={{ background: "white", borderRadius: "12px", padding: "24px 28px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: "20px" }}>
              <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: "700", color: "#1F2937" }}>
                Import terminé ✅
              </h2>
              <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#6B7280" }}>
                Voici le bilan de l&apos;import en lot.
              </p>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {[
                  { label: "Importées",  value: nbOk,         bg: "#F0FDF4", color: "#16A34A" },
                  { label: "Avec écarts",value: totalEcarts,  bg: "#FEF2F2", color: "#DC2626" },
                  { label: "Erreurs",    value: nbErrProcess, bg: "#FEF2F2", color: "#DC2626" },
                ].map((c) => (
                  <div key={c.label} style={{ background: c.bg, borderRadius: "8px", padding: "10px 20px", textAlign: "center", minWidth: "90px" }}>
                    <div style={{ fontSize: "28px", fontWeight: "900", color: c.color }}>{c.value}</div>
                    <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>{c.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tableau résultats */}
            <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflow: "hidden", marginBottom: "20px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F9FAFB" }}>
                  <th style={{ width: "40px", padding: "10px 14px", borderBottom: "1px solid #E5E7EB" }} />
                  {["Fichier", "N° facture", "Date", "Total HT", "Lignes", "Alertes", "Statut / Erreur"].map((h) => (
                    <th key={h} style={{
                      textAlign: "left", padding: "10px 14px",
                      fontSize: "11px", color: "#6B7280", fontWeight: "700",
                      textTransform: "uppercase", letterSpacing: "0.04em",
                      borderBottom: "1px solid #E5E7EB",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resultatsProcess.map((r, i) => {
                  const isOk = r.statut === "ok" && !!r.invoice_id;
                  const isChecked = isOk && selection.has(r.invoice_id!);
                  return (
                    <tr key={r.nom_fichier} style={{
                      background: isChecked ? "#FEF2F2" : r.statut === "erreur" ? "#FEF2F2" : i % 2 === 1 ? "#F9FAFB" : "white",
                      borderBottom: "1px solid #F3F4F6",
                    }}>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        {isOk && (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelection(r.invoice_id!)}
                            style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#DC2626" }}
                          />
                        )}
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: "12px", fontFamily: "monospace", color: isChecked ? "#DC2626" : "#374151", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: isChecked ? "line-through" : "none" }}>
                        {r.nom_fichier}
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: "12px", fontFamily: "monospace", color: "#374151" }}>
                        {r.numero_facture ?? "—"}
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: "12px", color: "#6B7280", whiteSpace: "nowrap" }}>
                        {r.date_facture ? new Date(r.date_facture).toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: "13px", fontWeight: "700", color: "#1F2937", textAlign: "right" }}>
                        {r.total_ht != null ? r.total_ht.toFixed(2).replace(".", ",") + " €" : "—"}
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: "13px", color: "#6B7280", textAlign: "right" }}>
                        {r.nb_lignes ?? "—"}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right" }}>
                        {r.nb_alertes != null ? (
                          <span style={{
                            fontSize: "12px", fontWeight: "700", padding: "2px 8px", borderRadius: "12px",
                            background: r.nb_alertes > 0 ? "#FEF2F2" : "#F0FDF4",
                            color: r.nb_alertes > 0 ? "#DC2626" : "#16A34A",
                          }}>
                            {r.nb_alertes > 0 ? `⚠️ ${r.nb_alertes}` : "✅ 0"}
                          </span>
                        ) : "—"}
                      </td>
                      <td style={{ padding: "10px 14px", maxWidth: "260px" }}>
                        {r.statut === "ok" && r.invoice_id ? (
                          <a href={`/factures/${r.invoice_id}/resultat`} style={{
                            fontSize: "12px", fontWeight: "700", color: "#1D4ED8",
                            textDecoration: "none", background: "#EFF6FF",
                            padding: "3px 10px", borderRadius: "6px",
                            border: "1px solid #BFDBFE",
                          }}>
                            Voir →
                          </a>
                        ) : r.statut === "erreur" ? (
                          <span style={{ fontSize: "11px", color: "#DC2626", fontWeight: "600", display: "block", wordBreak: "break-word" }}>
                            ❌ {r.raison ?? "Erreur inconnue"}
                          </span>
                        ) : (
                          <span style={{ fontSize: "12px", color: "#9CA3AF" }}>
                            {r.raison === "Supprimée" ? "🗑 Supprimée" : "Ignoré"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
