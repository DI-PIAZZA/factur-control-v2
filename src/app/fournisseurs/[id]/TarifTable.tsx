"use client";

import { useState, useMemo, useRef, useCallback } from "react";

interface TarifLine {
  id: string;
  ref_article: string;
  label: string;
  unit_price: number;
  unit_price_add?: number | null;
  unit: string;
  remise_fournisseur_valeur?: number | null;
  remise_fournisseur_pct?: number | null;
  remise_producteur_valeur?: number | null;
  remise_producteur_pct?: number | null;
  gratuite_x?: number | null;
  gratuite_y?: number | null;
  gratuite_debut?: string | null;
  gratuite_fin?: string | null;
  rfa_prod_debut?: string | null;
  rfa_prod_fin?: string | null;
  valid_from: string;
  origin: string;
}

type EditKey = `${string}.${string}`;

const TEXT_FIELDS = ["ref_article", "label", "unit"];
const DATE_FIELDS = ["gratuite_debut", "gratuite_fin", "rfa_prod_debut", "rfa_prod_fin"];

function fmtNum(v: number | null | undefined, dec = 4) {
  const n = Number(v) || 0;
  return n === 0 ? "—" : n.toFixed(dec).replace(".", ",");
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  const [y, m] = d.split("-");
  return `${m}/${y}`;
}

function calcNet(row: TarifLine) {
  const base = Number(row.unit_price) || 0;
  const rfVal = Number(row.remise_fournisseur_valeur) || 0;
  const rfPct = Number(row.remise_fournisseur_pct) || 0;
  const rpVal = Number(row.remise_producteur_valeur) || 0;
  const rpPct = Number(row.remise_producteur_pct) || 0;
  return base - rfVal - (base * rfPct / 100) - rpVal - (base * rpPct / 100);
}

function calcNetNet(row: TarifLine) {
  const net = calcNet(row);
  const gx = Number(row.gratuite_x) || 0;
  const gy = Number(row.gratuite_y) || 0;
  return gx > 0 && gy > 0 && gx > gy ? net * (gx - gy) / gx : net;
}

export default function TarifTable({
  tarifs,
  priceColumnName,
  costColumnName,
}: {
  tarifs: TarifLine[];
  priceColumnName?: string | null;
  costColumnName?: string | null;
}) {
  const [rows, setRows] = useState<TarifLine[]>(tarifs);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<{ id: string; field: string } | null>(null);
  const [editVal, setEditVal] = useState("");
  const [saving, setSaving] = useState<Set<EditKey>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (t) => t.ref_article?.toLowerCase().includes(q) || t.label?.toLowerCase().includes(q)
    );
  }, [query, rows]);

  const startEdit = useCallback((id: string, field: string, currentValue: unknown) => {
    setEditing({ id, field });
    const isText = TEXT_FIELDS.includes(field);
    const isDate = DATE_FIELDS.includes(field);
    if (isText || isDate) {
      setEditVal(String(currentValue ?? ""));
    } else {
      setEditVal((Number(currentValue) || 0) === 0 ? "" : String(Number(currentValue)));
    }
    setTimeout(() => inputRef.current?.select(), 0);
  }, []);

  const cancelEdit = useCallback(() => setEditing(null), []);

  const saveEdit = useCallback(async () => {
    if (!editing) return;
    const { id, field } = editing;
    const isText = TEXT_FIELDS.includes(field);
    const isDate = DATE_FIELDS.includes(field);
    const parsed = isText ? editVal
      : isDate ? (editVal === "" ? null : editVal)
      : (editVal === "" ? null : Number(editVal));

    // Optimistic update
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: parsed } : r))
    );
    setEditing(null);

    const key: EditKey = `${id}.${field}`;
    setSaving((s) => new Set([...s, key]));

    const res = await fetch("/api/update-tarif-field", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, field, value: parsed }),
    });

    // Appliquer les dates auto-remplies retournées par le serveur
    if (res.ok) {
      const json = await res.json().catch(() => null);
      if (json?.autoFilled && Object.keys(json.autoFilled).length > 1) {
        setRows((prev) =>
          prev.map((r) => r.id === id ? { ...r, ...json.autoFilled } : r)
        );
      }
    }

    setSaving((s) => { const ns = new Set(s); ns.delete(key); return ns; });
  }, [editing, editVal]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") { e.preventDefault(); saveEdit(); }
      if (e.key === "Escape") cancelEdit();
    },
    [saveEdit, cancelEdit]
  );

  // Cellule éditable générique
  function Cell({
    row,
    field,
    display,
    align = "left",
    style = {},
    inputStyle = {},
    placeholder = "",
    step = "0.0001",
    type = "number",
  }: {
    row: TarifLine;
    field: string;
    display: string;
    align?: "left" | "right" | "center";
    style?: React.CSSProperties;
    inputStyle?: React.CSSProperties;
    placeholder?: string;
    step?: string;
    type?: string;
  }) {
    const isEdit = editing?.id === row.id && editing?.field === field;
    const isSaving = saving.has(`${row.id}.${field}` as EditKey);
    const currentValue = (row as unknown as Record<string, unknown>)[field];

    if (isEdit) {
      return (
        <td style={{ padding: "4px 6px", ...style }}>
          <input
            ref={inputRef}
            type={type}
            step={step}
            value={editVal}
            placeholder={placeholder}
            onChange={(e) => setEditVal(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleKeyDown}
            style={{
              width: "100%", minWidth: "70px", padding: "5px 7px",
              border: "2px solid #1D4ED8", borderRadius: "6px",
              fontSize: "13px", fontWeight: "700", outline: "none",
              background: "white", color: "#1F2937",
              fontFamily: type === "number" ? "monospace" : "inherit",
              boxSizing: "border-box",
              ...inputStyle,
            }}
            autoFocus
          />
        </td>
      );
    }

    return (
      <td
        onClick={() => startEdit(row.id, field, currentValue)}
        title="Cliquer pour modifier"
        style={{
          padding: "10px 8px", fontSize: "13px", textAlign: align,
          cursor: "text", userSelect: "none",
          opacity: isSaving ? 0.5 : 1,
          transition: "background 0.1s",
          ...style,
        }}
      >
        {isSaving ? (
          <span style={{ color: "#9CA3AF", fontSize: "11px" }}>…</span>
        ) : (
          <span style={{
            borderBottom: "1px dashed transparent",
            paddingBottom: "1px",
          }}
            onMouseEnter={(e) => (e.currentTarget.style.borderBottomColor = "#9CA3AF")}
            onMouseLeave={(e) => (e.currentTarget.style.borderBottomColor = "transparent")}
          >
            {display}
          </span>
        )}
      </td>
    );
  }

  return (
    <div>
      {/* Barre de recherche */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: "380px" }}>
          <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "16px", color: "#9CA3AF", pointerEvents: "none" }}>🔍</span>
          <input
            type="text"
            placeholder="Rechercher par libellé ou réf. article…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: "100%", paddingLeft: "36px", paddingRight: query ? "32px" : "12px",
              paddingTop: "8px", paddingBottom: "8px",
              border: `1px solid ${query ? "#E85A00" : "#E5E7EB"}`, borderRadius: "8px",
              fontSize: "13px", color: "#1F2937", outline: "none",
              background: query ? "#FFFBF5" : "white", boxSizing: "border-box", transition: "border-color 0.15s",
            }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: "16px", lineHeight: 1, padding: 0 }}>✕</button>
          )}
        </div>
        {query && (
          <span style={{ fontSize: "13px", color: "#6B7280" }}>
            <strong style={{ color: "#1F2937" }}>{filtered.length}</strong> / {rows.length} ligne{rows.length > 1 ? "s" : ""}
          </span>
        )}
        <span style={{ fontSize: "11px", color: "#9CA3AF", marginLeft: "auto" }}>
          💡 Cliquez sur une cellule pour la modifier
        </span>
      </div>

      {/* Tableau */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F1F5F9" }}>
              <th style={thBase({ center: true })}>Orig.</th>
              <th style={thBase({})}>Réf. article</th>
              <th style={thBase({})}>Libellé</th>
              <th style={thBase({})}>Unité</th>
              <th style={{ ...thBase({}), color: "#15803D", background: "#DCFCE7", borderBottom: "2px solid #16A34A", fontWeight: "900" }}>
                {priceColumnName ?? "Prix Net"} ✓
              </th>
              <th style={thBase({ right: true })}>Remise Fourn. €</th>
              <th style={thBase({ right: true })}>Remise Fourn. %</th>
              <th style={thBase({ right: true })}>Remise Prod. €</th>
              <th style={thBase({ right: true })}>Remise Prod. %</th>
              <th style={{ ...thBase({ center: true }), color: "#4338CA", background: "#EEF2FF", borderBottom: "1px solid #C7D2FE", fontSize: "9px" }}>RFA P. début</th>
              <th style={{ ...thBase({ center: true }), color: "#4338CA", background: "#EEF2FF", borderBottom: "1px solid #C7D2FE", fontSize: "9px" }}>RFA P. fin</th>
              <th style={{ ...thBase({ center: true }), color: "#D97706", background: "#FEF9C3", borderBottom: "1px solid #FDE68A" }}>Achat</th>
              <th style={{ ...thBase({ center: true }), color: "#D97706", background: "#FEF9C3", borderBottom: "1px solid #FDE68A" }}>Dont gratuit</th>
              <th style={{ ...thBase({ center: true }), color: "#16A34A", background: "#F0FDF4", borderBottom: "1px solid #86EFAC", fontSize: "9px" }}>Grat. début</th>
              <th style={{ ...thBase({ center: true }), color: "#16A34A", background: "#F0FDF4", borderBottom: "1px solid #86EFAC", fontSize: "9px" }}>Grat. fin</th>
              <th style={{ ...thBase({}), color: "white", background: "#E85A00", borderBottom: "3px solid #C2410C", fontWeight: "900", fontSize: "11px", letterSpacing: "0.06em", boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.15)" }}>★ Net Net €</th>
              {costColumnName && (
                <th style={{ ...thBase({}), color: "white", background: "#92400E", borderBottom: "3px solid #78350F", fontWeight: "900", fontSize: "11px", letterSpacing: "0.06em", boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.15)", whiteSpace: "nowrap" }}>
                  ★ PRIX DE REVIENT HT
                </th>
              )}
              <th style={thBase({})}>Actif depuis</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={costColumnName ? 18 : 17} style={{ padding: "40px", textAlign: "center", color: "#9CA3AF", fontSize: "14px" }}>
                  Aucun article ne correspond à &quot;{query}&quot;
                </td>
              </tr>
            ) : (
              filtered.map((t, i) => {
                const isOdd = i % 2 === 1;
                const rowBg = isOdd ? "#F8FAFC" : "white";

                const rfVal = Number(t.remise_fournisseur_valeur) || 0;
                const rfPct = Number(t.remise_fournisseur_pct) || 0;
                const rpVal = Number(t.remise_producteur_valeur) || 0;
                const rpPct = Number(t.remise_producteur_pct) || 0;
                const gx = Number(t.gratuite_x) || 0;
                const gy = Number(t.gratuite_y) || 0;
                const hasRemise   = rfVal > 0 || rfPct > 0 || rpVal > 0 || rpPct > 0;
                const hasGratuite = gx > 0 && gy > 0 && gx > gy;
                const netNet = calcNetNet(t);
                const droits = Number(t.unit_price_add) || 0;
                const prixRevient = netNet + droits;

                return (
                  <tr key={t.id} style={{ borderBottom: "1px solid #E5E7EB" }}>

                    {/* T/F — non éditable */}
                    <td style={{ padding: "8px", textAlign: "center", background: rowBg }}>
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", borderRadius: "4px", fontSize: "11px", fontWeight: "800", background: (t.origin === "ai_extraction" || t.origin === "excel_import") ? "#EFF6FF" : "#FFF7ED", color: (t.origin === "ai_extraction" || t.origin === "excel_import") ? "#1D4ED8" : "#E85A00" }}>
                        {(t.origin === "ai_extraction" || t.origin === "excel_import") ? "T" : "F"}
                      </span>
                    </td>

                    {/* Réf. article */}
                    <Cell row={t} field="ref_article" display={t.ref_article || "—"} type="text" step="" placeholder="Réf."
                      style={{ background: rowBg, fontFamily: "monospace", fontWeight: "600", color: "#374151", whiteSpace: "nowrap" }} />

                    {/* Libellé */}
                    <Cell row={t} field="label" display={t.label || "—"} type="text" step="" placeholder="Libellé"
                      style={{ background: rowBg, color: "#1F2937", fontWeight: "500" }} />

                    {/* Unité */}
                    <Cell row={t} field="unit" display={t.unit || "—"} type="text" step="" placeholder="pièce…"
                      style={{ background: rowBg, color: "#6B7280" }} />

                    {/* Prix de référence (vert) */}
                    <Cell row={t} field="unit_price"
                      display={`${(Number(t.unit_price) || 0).toFixed(4).replace(".", ",")} €`}
                      step="0.0001" placeholder="0"
                      style={{ background: isOdd ? "#DCFCE7" : "#F0FDF4", fontWeight: "800", color: "#15803D", whiteSpace: "nowrap" }}
                      inputStyle={{ color: "#15803D" }} />

                    {/* Remise Fourn. € */}
                    <Cell row={t} field="remise_fournisseur_valeur"
                      display={rfVal > 0 ? `${rfVal.toFixed(4).replace(".", ",")} €` : "—"}
                      align="right" placeholder="0"
                      style={{ background: rowBg, color: rfVal > 0 ? "#E85A00" : "#D1D5DB", fontWeight: rfVal > 0 ? "600" : "400" }} />

                    {/* Remise Fourn. % */}
                    <Cell row={t} field="remise_fournisseur_pct"
                      display={rfPct > 0 ? `${rfPct.toFixed(2).replace(".", ",")} %` : "—"}
                      align="right" step="0.01" placeholder="0"
                      style={{ background: rowBg, color: rfPct > 0 ? "#E85A00" : "#D1D5DB", fontWeight: rfPct > 0 ? "600" : "400" }} />

                    {/* Remise Prod. € */}
                    <Cell row={t} field="remise_producteur_valeur"
                      display={rpVal > 0 ? `${rpVal.toFixed(4).replace(".", ",")} €` : "—"}
                      align="right" placeholder="0"
                      style={{ background: rowBg, color: rpVal > 0 ? "#7C3AED" : "#D1D5DB", fontWeight: rpVal > 0 ? "600" : "400" }} />

                    {/* Remise Prod. % */}
                    <Cell row={t} field="remise_producteur_pct"
                      display={rpPct > 0 ? `${rpPct.toFixed(2).replace(".", ",")} %` : "—"}
                      align="right" step="0.01" placeholder="0"
                      style={{ background: rowBg, color: rpPct > 0 ? "#7C3AED" : "#D1D5DB", fontWeight: rpPct > 0 ? "600" : "400" }} />

                    {/* RFA Prod. début */}
                    <Cell row={t} field="rfa_prod_debut"
                      display={fmtDate(t.rfa_prod_debut)}
                      align="center" type="date" step=""
                      style={{ background: isOdd ? "#E0E7FF" : "#EEF2FF", color: t.rfa_prod_debut ? "#4338CA" : "#D1D5DB", fontSize: "12px" }} />

                    {/* RFA Prod. fin */}
                    <Cell row={t} field="rfa_prod_fin"
                      display={fmtDate(t.rfa_prod_fin)}
                      align="center" type="date" step=""
                      style={{ background: isOdd ? "#E0E7FF" : "#EEF2FF", color: t.rfa_prod_fin ? "#4338CA" : "#D1D5DB", fontSize: "12px" }} />

                    {/* Achat */}
                    <Cell row={t} field="gratuite_x"
                      display={gx > 0 ? String(gx) : "—"}
                      align="center" step="1" placeholder="ex: 11"
                      style={{ background: isOdd ? "#FEF9C3" : "#FFFBEB", color: gx > 0 ? "#B45309" : "#D1D5DB", fontWeight: gx > 0 ? "700" : "400" }} />

                    {/* Dont gratuit */}
                    <Cell row={t} field="gratuite_y"
                      display={gy > 0 ? `🎁 ${gy}` : "—"}
                      align="center" step="1" placeholder="ex: 1"
                      style={{ background: isOdd ? "#FEF9C3" : "#FFFBEB", color: gy > 0 ? "#D97706" : "#D1D5DB", fontWeight: gy > 0 ? "700" : "400" }} />

                    {/* Gratuité début */}
                    <Cell row={t} field="gratuite_debut"
                      display={fmtDate(t.gratuite_debut)}
                      align="center" type="date" step=""
                      style={{ background: isOdd ? "#DCFCE7" : "#F0FDF4", color: t.gratuite_debut ? "#16A34A" : "#D1D5DB", fontSize: "12px" }} />

                    {/* Gratuité fin */}
                    <Cell row={t} field="gratuite_fin"
                      display={fmtDate(t.gratuite_fin)}
                      align="center" type="date" step=""
                      style={{ background: isOdd ? "#DCFCE7" : "#F0FDF4", color: t.gratuite_fin ? "#16A34A" : "#D1D5DB", fontSize: "12px" }} />

                    {/* Net Net — calculé, non éditable, colonne reine */}
                    <td style={{
                      padding: "10px 10px", fontSize: "14px", fontWeight: "900",
                      whiteSpace: "nowrap",
                      background: isOdd ? "#FFEDD5" : "#FFF7ED",
                      color: hasGratuite ? "#9A3412" : hasRemise ? "#7C2D12" : "#C2410C",
                      borderLeft: "2px solid #FDBA74",
                      borderRight: "2px solid #FDBA74",
                    }}>
                      {netNet.toFixed(4).replace(".", ",")} €
                    </td>

                    {/* Prix de revient HT = Net Net + Droits — uniquement si cost_column défini */}
                    {costColumnName && (
                      <td style={{
                        padding: "10px 10px", fontSize: "14px", fontWeight: "900",
                        whiteSpace: "nowrap",
                        background: isOdd ? "#FEF3C7" : "#FFFBEB",
                        color: droits > 0 ? "#78350F" : "#92400E",
                        borderLeft: "2px solid #FCD34D",
                        borderRight: "2px solid #FCD34D",
                      }}>
                        {droits > 0 ? (
                          prixRevient.toFixed(4).replace(".", ",")
                        ) : (
                          <span style={{ color: "#D1D5DB", fontWeight: "400", fontSize: "12px" }}>—</span>
                        )} {droits > 0 ? "€" : ""}
                      </td>
                    )}

                    {/* Actif depuis — non éditable */}
                    <td style={{ padding: "10px 8px", fontSize: "12px", color: "#9CA3AF", whiteSpace: "nowrap", background: rowBg }}>
                      {new Date(t.valid_from).toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function thBase({ center, right }: { center?: boolean; right?: boolean }): React.CSSProperties {
  return {
    textAlign: center ? "center" : right ? "right" : "left",
    padding: "9px 8px", fontSize: "10px", color: "#6B7280",
    fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em",
    borderBottom: "1px solid #E2E8F0", whiteSpace: "nowrap",
  };
}
