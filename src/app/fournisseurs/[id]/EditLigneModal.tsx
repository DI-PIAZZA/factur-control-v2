"use client";

import { useState } from "react";
import { updateLigneAction } from "./actions";

interface Ligne {
  id: string;
  ref_article: string;
  label: string;
  unit_price: number;
  unit: string;
  remise_fournisseur_valeur?: number | null;
  remise_fournisseur_pct?: number | null;
  remise_producteur_valeur?: number | null;
  remise_producteur_pct?: number | null;
  gratuite_x?: number | null;
  gratuite_y?: number | null;
}

function n(v: number | null | undefined) { return Number(v) || 0; }
function fmt(v?: number | null) { return n(v) === 0 ? "" : String(n(v)); }

function calcNetNet(
  unitPrice: number,
  rfVal: number, rfPct: number,
  rpVal: number, rpPct: number,
  gx: number, gy: number,
): number {
  const net = unitPrice - rfVal - (unitPrice * rfPct / 100) - rpVal - (unitPrice * rpPct / 100);
  const hasGratuite = gx > 0 && gy > 0 && gx > gy;
  return hasGratuite ? net * (gx - gy) / gx : net;
}

export default function EditLigneModal({ ligne }: { ligne: Ligne }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Valeurs live pour le calcul
  const [price, setPrice]   = useState(n(ligne.unit_price));
  const [rfVal, setRfVal]   = useState(n(ligne.remise_fournisseur_valeur));
  const [rfPct, setRfPct]   = useState(n(ligne.remise_fournisseur_pct));
  const [rpVal, setRpVal]   = useState(n(ligne.remise_producteur_valeur));
  const [rpPct, setRpPct]   = useState(n(ligne.remise_producteur_pct));
  const [gx, setGx]         = useState(n(ligne.gratuite_x));
  const [gy, setGy]         = useState(n(ligne.gratuite_y));

  const net    = price - rfVal - (price * rfPct / 100) - rpVal - (price * rpPct / 100);
  const netNet = calcNetNet(price, rfVal, rfPct, rpVal, rpPct, gx, gy);
  const hasGratuite = gx > 0 && gy > 0 && gx > gy;
  const hasRemise   = rfVal > 0 || rfPct > 0 || rpVal > 0 || rpPct > 0;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    await updateLigneAction(ligne.id, fd);
    setSaving(false);
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Modifier cette ligne"
        style={{ fontSize: "12px", fontWeight: "600", color: "#374151", background: "white", border: "1px solid #E5E7EB", borderRadius: "6px", padding: "4px 10px", cursor: "pointer", whiteSpace: "nowrap" }}
      >
        ✏️
      </button>

      {open && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
        >
          <div style={{ background: "white", borderRadius: "16px", padding: "28px 32px", width: "620px", maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "#1F2937" }}>Modifier la ligne</h2>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#9CA3AF" }}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>

              {/* Réf + Libellé */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={lbl}>Réf. article</label>
                  <input name="ref_article" defaultValue={ligne.ref_article} required style={inp} />
                </div>
                <div>
                  <label style={lbl}>Libellé</label>
                  <input name="label" defaultValue={ligne.label} required style={inp} />
                </div>
              </div>

              {/* Prix + Unité */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label style={lbl}>Prix net HT (€)</label>
                  <input name="unit_price" type="number" step="0.0001" defaultValue={ligne.unit_price} required style={inp}
                    onChange={(e) => setPrice(Number(e.target.value) || 0)} />
                </div>
                <div>
                  <label style={lbl}>Unité</label>
                  <input name="unit" defaultValue={ligne.unit} style={inp} placeholder="pièce, kg…" />
                </div>
              </div>

              {/* Remises fournisseur */}
              <div style={{ background: "#FFF7ED", border: "1px solid #FDBA74", borderRadius: "10px", padding: "14px 16px", marginBottom: "12px" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#E85A00", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
                  Remise fournisseur
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={lbl}>Valeur (€)</label>
                    <input name="remise_fournisseur_valeur" type="number" step="0.0001" defaultValue={fmt(ligne.remise_fournisseur_valeur)} style={inp} placeholder="0"
                      onChange={(e) => setRfVal(Number(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label style={lbl}>Taux (%)</label>
                    <input name="remise_fournisseur_pct" type="number" step="0.01" defaultValue={fmt(ligne.remise_fournisseur_pct)} style={inp} placeholder="0"
                      onChange={(e) => setRfPct(Number(e.target.value) || 0)} />
                  </div>
                </div>
              </div>

              {/* Remises producteur */}
              <div style={{ background: "#F5F3FF", border: "1px solid #C4B5FD", borderRadius: "10px", padding: "14px 16px", marginBottom: "12px" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
                  Remise producteur
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={lbl}>Valeur (€)</label>
                    <input name="remise_producteur_valeur" type="number" step="0.0001" defaultValue={fmt(ligne.remise_producteur_valeur)} style={inp} placeholder="0"
                      onChange={(e) => setRpVal(Number(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label style={lbl}>Taux (%)</label>
                    <input name="remise_producteur_pct" type="number" step="0.01" defaultValue={fmt(ligne.remise_producteur_pct)} style={inp} placeholder="0"
                      onChange={(e) => setRpPct(Number(e.target.value) || 0)} />
                  </div>
                </div>
              </div>

              {/* Gratuité */}
              <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "10px", padding: "14px 16px", marginBottom: "16px" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#D97706", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
                  🎁 Gratuité fournisseur
                </div>
                <p style={{ fontSize: "12px", color: "#92400E", margin: "0 0 10px" }}>
                  Ex : commandez 11, dont 1 gratuit → Achat = 11, Dont gratuit = 1
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={lbl}>Achat (total reçu)</label>
                    <input name="gratuite_x" type="number" step="1" min="0" defaultValue={fmt(ligne.gratuite_x)} style={inp} placeholder="ex : 11"
                      onChange={(e) => setGx(Number(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label style={lbl}>Dont gratuit</label>
                    <input name="gratuite_y" type="number" step="1" min="0" defaultValue={fmt(ligne.gratuite_y)} style={inp} placeholder="ex : 1"
                      onChange={(e) => setGy(Number(e.target.value) || 0)} />
                  </div>
                </div>
              </div>

              {/* Récap Net Net en direct */}
              <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: "10px", padding: "14px 16px", marginBottom: "20px" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#15803D", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
                  Récapitulatif calculé
                </div>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: "120px" }}>
                    <div style={{ fontSize: "11px", color: "#6B7280", marginBottom: "2px" }}>Prix de référence</div>
                    <div style={{ fontSize: "16px", fontWeight: "800", color: "#15803D" }}>
                      {price.toFixed(4).replace(".", ",")} €
                    </div>
                  </div>
                  {hasRemise && (
                    <div style={{ flex: 1, minWidth: "120px" }}>
                      <div style={{ fontSize: "11px", color: "#6B7280", marginBottom: "2px" }}>Après remises</div>
                      <div style={{ fontSize: "16px", fontWeight: "800", color: "#1D4ED8" }}>
                        {net.toFixed(4).replace(".", ",")} €
                      </div>
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: "120px" }}>
                    <div style={{ fontSize: "11px", color: "#6B7280", marginBottom: "2px" }}>
                      Net Net{hasGratuite ? ` (gratuit: ${gy}/${gx})` : ""}
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: "900", color: hasGratuite || hasRemise ? "#B45309" : "#9CA3AF" }}>
                      {netNet.toFixed(4).replace(".", ",")} €
                    </div>
                  </div>
                </div>
              </div>

              {/* Boutons */}
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="submit" disabled={saving} style={{ flex: 1, background: saving ? "#9CA3AF" : "#1D4ED8", color: "white", border: "none", borderRadius: "8px", padding: "12px", fontSize: "14px", fontWeight: "700", cursor: saving ? "not-allowed" : "pointer" }}>
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </button>
                <button type="button" onClick={() => setOpen(false)} style={{ background: "#F3F4F6", color: "#374151", border: "none", borderRadius: "8px", padding: "12px 20px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>
                  Annuler
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </>
  );
}

const lbl: React.CSSProperties = { display: "block", fontSize: "12px", fontWeight: "600", color: "#6B7280", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.04em" };
const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #D1D5DB", fontSize: "13px", color: "#1F2937", boxSizing: "border-box" };
