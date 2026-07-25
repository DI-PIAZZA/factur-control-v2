"use client";

import { useState } from "react";

interface MismatchLine {
  refArticle: string | null;
  label: string;
  quantity: number;
  unitPriceFact: number;
  unitPriceRef: number;
  delta: number;
}

interface Props {
  lines: MismatchLine[];
  supplierName: string;
  supplierEmail: string | null;
  userEmail: string;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  totalEcart: number;
}

export default function MailAvoirModal({
  lines,
  supplierName,
  supplierEmail,
  userEmail,
  invoiceNumber,
  invoiceDate,
  totalEcart,
}: Props) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const invDate = invoiceDate
    ? new Date(invoiceDate).toLocaleDateString("fr-FR")
    : "—";

  const detailLines = lines
    .map((l) => {
      const unitDelta = l.quantity > 0 ? l.delta / l.quantity : l.delta;
      const totalLine = l.delta;
      return `  • ${l.refArticle ? `[${l.refArticle}] ` : ""}${l.label}\n    Qté : ${l.quantity} | Prix facturé : ${l.unitPriceFact.toFixed(4).replace(".", ",")} € | Prix tarif : ${l.unitPriceRef.toFixed(4).replace(".", ",")} € | Écart unitaire : +${unitDelta.toFixed(4).replace(".", ",")} € → Total : +${totalLine.toFixed(2).replace(".", ",")} €`;
    })
    .join("\n\n");

  const text = `Objet : Demande d'avoir — Facture n° ${invoiceNumber ?? "—"} du ${invDate}

Madame, Monsieur,

Suite au contrôle de votre facture n° ${invoiceNumber ?? "—"} en date du ${invDate}, nous avons constaté des écarts entre les prix facturés et nos tarifs négociés.

Détail des écarts constatés :

${detailLines}

Montant total de la sur-facturation : + ${totalEcart.toFixed(2).replace(".", ",")} €

Nous vous remercions de bien vouloir établir un avoir d'un montant de ${totalEcart.toFixed(2).replace(".", ",")} € afin de régulariser ces écarts dans les meilleurs délais.

Cordialement,`;

  const sendEmail = async () => {
    // Validation
    if (!supplierEmail) {
      setResult({
        success: false,
        message: "⚠️ Email du fournisseur non configuré. Veuillez mettre à jour la fiche fournisseur.",
      });
      return;
    }

    if (!userEmail) {
      setResult({
        success: false,
        message: "❌ Votre email n'est pas configuré.",
      });
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/send-avoir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          supplierEmail,
          supplierName,
          invoiceNumber,
          invoiceDate,
          mismatchLines: lines,
          totalEcart,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({
          success: false,
          message: `❌ ${data.error || "Erreur lors de l'envoi"}`,
        });
        return;
      }

      setResult({
        success: true,
        message: data.demo
          ? `✅ Email prêt à envoyer (mode démo) → ${supplierEmail}`
          : `✅ Email envoyé avec succès à ${supplierEmail}`,
      });

      // Fermer la modale après 3s
      setTimeout(() => {
        setOpen(false);
        setResult(null);
      }, 3000);
    } catch (error) {
      setResult({
        success: false,
        message: `❌ ${String(error)}`,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setResult(null);
        }}
        style={{
          background: "#1D4ED8",
          color: "white",
          border: "none",
          borderRadius: "8px",
          padding: "8px 16px",
          fontSize: "13px",
          fontWeight: "600",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        ✉️ Générer mail avoir
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "14px",
              padding: "28px",
              maxWidth: "720px",
              width: "100%",
              boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: "17px",
                    fontWeight: "800",
                    color: "#1F2937",
                    margin: 0,
                  }}
                >
                  ✉️ Mail demande d'avoir
                </h2>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#9CA3AF",
                    margin: "4px 0 0",
                  }}
                >
                  {supplierEmail
                    ? `Envoi à ${supplierName} (${supplierEmail})`
                    : `⚠️ Email du fournisseur non configuré`}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "#F3F4F6",
                  border: "none",
                  fontSize: "16px",
                  cursor: "pointer",
                  color: "#6B7280",
                  lineHeight: 1,
                  padding: "6px 10px",
                  borderRadius: "6px",
                }}
              >
                ✕
              </button>
            </div>

            {/* Résultat */}
            {result && (
              <div
                style={{
                  background: result.success ? "#F0FDF4" : "#FEF2F2",
                  border: `1px solid ${result.success ? "#86EFAC" : "#FECACA"}`,
                  borderRadius: "8px",
                  padding: "12px 16px",
                  marginBottom: "16px",
                  color: result.success ? "#16A34A" : "#DC2626",
                  fontSize: "13px",
                  fontWeight: "600",
                }}
              >
                {result.message}
              </div>
            )}

            {/* Texte du mail */}
            <div
              style={{
                background: "#F8FAFC",
                borderRadius: "8px",
                padding: "18px 20px",
                fontFamily: "monospace",
                fontSize: "12.5px",
                color: "#1F2937",
                lineHeight: "1.75",
                whiteSpace: "pre-wrap",
                border: "1px solid #E2E8F0",
                maxHeight: "360px",
                overflowY: "auto",
                opacity: result?.success ? 0.5 : 1,
              }}
            >
              {text}
            </div>

            {/* Résumé montant */}
            <div
              style={{
                marginTop: "16px",
                background: "#FEF2F2",
                borderRadius: "8px",
                padding: "10px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                border: "1px solid #FEE2E2",
              }}
            >
              <span style={{ fontSize: "13px", color: "#374151", fontWeight: "600" }}>
                Montant de l'avoir à demander
              </span>
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: "900",
                  color: "#DC2626",
                }}
              >
                + {totalEcart.toFixed(2).replace(".", ",")} €
              </span>
            </div>

            {/* Actions */}
            <div
              style={{
                marginTop: "18px",
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "#F3F4F6",
                  color: "#374151",
                  border: "none",
                  borderRadius: "8px",
                  padding: "9px 20px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Fermer
              </button>
              <button
                onClick={sendEmail}
                disabled={sending || !supplierEmail || result?.success}
                style={{
                  background:
                    sending || !supplierEmail || result?.success
                      ? "#9CA3AF"
                      : "#E85A00",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "9px 24px",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor:
                    sending || !supplierEmail || result?.success
                      ? "not-allowed"
                      : "pointer",
                  minWidth: "160px",
                  opacity: sending || !supplierEmail ? 0.6 : 1,
                }}
              >
                {sending ? "⏳ Envoi…" : result?.success ? "✅ Envoyé" : "🚀 Envoyer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
