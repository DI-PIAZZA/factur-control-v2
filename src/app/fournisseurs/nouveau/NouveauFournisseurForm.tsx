"use client";

import { useActionState, useState } from "react";
import { searchPappersAction, addFournisseurAction, type SearchState } from "./actions";

const initialState: SearchState = { results: null, error: null, query: "" };

export default function NouveauFournisseurForm() {
  const [state, formAction, isPending] = useActionState(searchPappersAction, initialState);
  const [showManuel, setShowManuel] = useState(false);

  // Détection erreur Pappers crédits
  const isPappersCreditsError =
    state.error?.includes("crédits") || state.error?.includes("401");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Champ de recherche */}
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        <label
          style={{
            display: "block",
            fontSize: "14px",
            fontWeight: "600",
            color: "#1F2937",
            marginBottom: "8px",
          }}
        >
          Rechercher par nom ou SIREN
        </label>
        <p style={{ fontSize: "13px", color: "#6B7280", marginBottom: "16px" }}>
          Tapez le nom de votre fournisseur ou son numéro SIREN (9 chiffres — pas le SIRET à 14). La dénomination
          officielle et le SIRET siège seront récupérés automatiquement.
        </p>
        <form action={formAction} style={{ display: "flex", gap: "12px" }}>
          <input
            name="query"
            defaultValue={state.query}
            placeholder="Ex : ROSSI 84 ou SIREN 9 chiffres"
            style={{
              flex: 1,
              padding: "10px 14px",
              border: "1px solid #D1D5DB",
              borderRadius: "8px",
              fontSize: "14px",
              color: "#1F2937",
              outline: "none",
            }}
            required
          />
          <button
            type="submit"
            disabled={isPending}
            style={{
              background: isPending ? "#9CA3AF" : "#1D4ED8",
              color: "white",
              padding: "10px 20px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              border: "none",
              cursor: isPending ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {isPending ? "Recherche..." : "🔍 Rechercher"}
          </button>
        </form>
      </div>

      {/* Erreur Pappers */}
      {state.error && (
        <div
          style={{
            background: "#FEF2F2",
            border: "1px solid #FCA5A5",
            borderRadius: "8px",
            padding: "14px 16px",
            color: "#DC2626",
            fontSize: "14px",
          }}
        >
          <div style={{ marginBottom: isPappersCreditsError ? "10px" : "0" }}>
            ⚠️ {state.error}
          </div>
          {isPappersCreditsError && (
            <div style={{ fontSize: "13px", color: "#7F1D1D" }}>
              Vous pouvez recharger des crédits sur{" "}
              <a
                href="https://moncompte.pappers.fr"
                target="_blank"
                rel="noreferrer"
                style={{ color: "#1D4ED8" }}
              >
                moncompte.pappers.fr
              </a>{" "}
              ou utiliser la saisie manuelle ci-dessous.
            </div>
          )}
        </div>
      )}

      {/* Bouton saisie manuelle (si erreur Pappers ou zéro résultats) */}
      {(state.error || (state.results && state.results.length === 0)) && !showManuel && (
        <button
          onClick={() => setShowManuel(true)}
          style={{
            background: "white",
            border: "2px dashed #D1D5DB",
            borderRadius: "12px",
            padding: "16px",
            fontSize: "14px",
            color: "#6B7280",
            cursor: "pointer",
            textAlign: "center",
            width: "100%",
          }}
        >
          ✏️ Saisie manuelle (nom + SIRET)
        </button>
      )}

      {/* Formulaire saisie manuelle */}
      {showManuel && (
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            border: "2px solid #E85A00",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#1F2937", margin: 0 }}>
              ✏️ Saisie manuelle
            </h3>
            <button
              onClick={() => setShowManuel(false)}
              style={{
                background: "none",
                border: "none",
                fontSize: "18px",
                color: "#9CA3AF",
                cursor: "pointer",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
          <p style={{ fontSize: "13px", color: "#6B7280", marginBottom: "20px", marginTop: 0 }}>
            Renseignez la dénomination officielle et le SIRET (14 chiffres) de votre fournisseur.
          </p>
          <form action={addFournisseurAction} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Dénomination officielle *
              </label>
              <input
                name="name"
                placeholder="Ex : ROSSI 84 SAS"
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #D1D5DB",
                  borderRadius: "8px",
                  fontSize: "14px",
                  color: "#1F2937",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                SIRET (14 chiffres) *
              </label>
              <input
                name="siret"
                placeholder="Ex : 12345678900012"
                required
                maxLength={14}
                pattern="\d{14}"
                title="14 chiffres sans espaces"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #D1D5DB",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontFamily: "monospace",
                  color: "#1F2937",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                background: "#E85A00",
                color: "white",
                padding: "12px 24px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                border: "none",
                cursor: "pointer",
                alignSelf: "flex-start",
              }}
            >
              + Ajouter ce fournisseur
            </button>
          </form>
        </div>
      )}

      {/* Aucun résultat */}
      {!state.error && state.results && state.results.length === 0 && (
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "32px",
            textAlign: "center",
            color: "#6B7280",
            fontSize: "14px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          Aucune entreprise trouvée pour « {state.query} »
        </div>
      )}

      {/* Résultats Pappers */}
      {state.results && state.results.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>
            {state.results.length} résultat{state.results.length > 1 ? "s" : ""} — cliquez
            sur « Ajouter » pour sélectionner un fournisseur.
          </p>

          {state.results.map((r) => {
            const displayName = r.denomination || r.nom_entreprise || "—";
            const nomCommercial = r.nom_commercial || r.enseigne_1 || "";
            const siret = r.siege?.siret ?? "—";
            const codePostal = r.siege?.code_postal ?? "";
            const ville = r.siege?.ville ?? "";

            return (
              <div
                key={r.siren}
                style={{
                  background: "white",
                  borderRadius: "12px",
                  padding: "20px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "16px",
                }}
              >
                {/* Infos */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "15px", fontWeight: "800", color: "#1F2937", marginBottom: "2px" }}>
                    {displayName}
                  </div>
                  {nomCommercial && nomCommercial !== displayName && (
                    <div style={{ fontSize: "13px", color: "#E85A00", fontWeight: "600", marginBottom: "6px" }}>
                      {nomCommercial}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginTop: "4px" }}>
                    <span style={{ fontSize: "12px", color: "#6B7280" }}>
                      SIRET : <span style={{ fontFamily: "monospace", color: "#374151" }}>{siret}</span>
                    </span>
                    {(codePostal || ville) && (
                      <span style={{ fontSize: "12px", color: "#9CA3AF" }}>
                        📍 {[codePostal, ville].filter(Boolean).join(" ")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bouton Ajouter */}
                <form action={addFournisseurAction} style={{ flexShrink: 0 }}>
                  <input type="hidden" name="name" value={displayName} />
                  <input type="hidden" name="siret" value={siret} />
                  <input type="hidden" name="siren" value={r.siren} />
                  <input type="hidden" name="nom_commercial" value={nomCommercial} />
                  <input type="hidden" name="code_postal" value={codePostal} />
                  <input type="hidden" name="ville" value={ville} />
                  <button
                    type="submit"
                    style={{
                      background: "#E85A00",
                      color: "white",
                      padding: "8px 18px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: "600",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    + Ajouter
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
