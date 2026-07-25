import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Envoie un email de demande d'avoir
 * Mode actuel : démo (validation + log)
 * À intégrer : Gmail API, SendGrid, ou autre service
 */

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { userEmail, supplierEmail, supplierName, invoiceNumber, invoiceDate, mismatchLines, totalEcart } = await req.json();

    // Validation
    if (!userEmail || !supplierEmail) {
      return NextResponse.json(
        { error: "Email utilisateur ou fournisseur manquant" },
        { status: 400 }
      );
    }

    // Formater le contenu du mail
    const invDate = invoiceDate
      ? new Date(invoiceDate).toLocaleDateString("fr-FR")
      : "—";

    const detailLines = (mismatchLines || [])
      .map((l: any) => {
        const unitDelta = l.quantity > 0 ? l.delta / l.quantity : l.delta;
        return `  • ${l.refArticle ? `[${l.refArticle}] ` : ""}${l.label}\n    Qté : ${l.quantity} | Prix facturé : ${l.unitPriceFact.toFixed(4).replace(".", ",")} € | Prix tarif : ${l.unitPriceRef.toFixed(4).replace(".", ",")} € | Écart unitaire : +${unitDelta.toFixed(4).replace(".", ",")} € → Total : +${l.delta.toFixed(2).replace(".", ",")} €`;
      })
      .join("\n\n");

    const mailContent = `Objet : Demande d'avoir — Facture n° ${invoiceNumber ?? "—"} du ${invDate}

Madame, Monsieur,

Suite au contrôle de votre facture n° ${invoiceNumber ?? "—"} en date du ${invDate}, nous avons constaté des écarts entre les prix facturés et nos tarifs négociés.

Détail des écarts constatés :

${detailLines}

Montant total de la sur-facturation : + ${totalEcart.toFixed(2).replace(".", ",")} €

Nous vous remercions de bien vouloir établir un avoir d'un montant de ${totalEcart.toFixed(2).replace(".", ",")} € afin de régulariser ces écarts dans les meilleurs délais.

Cordialement,
${userEmail}`;

    // Log pour démo
    console.log(`[AVOIR] Email à envoyer à ${supplierEmail} (${supplierName})`);
    console.log(`[AVOIR] De : ${userEmail}`);
    console.log(`[AVOIR] Montant : ${totalEcart.toFixed(2).replace(".", ",")} €`);

    // Mode démo : retourner succès
    // En prod : intégrer Gmail API, SendGrid, ou autre service
    return NextResponse.json({
      success: true,
      message: "Email prêt à envoyer (mode démo - configuration Gmail requise)",
      demo: true,
      to: supplierEmail,
      subject: `Demande d'avoir — Facture n° ${invoiceNumber ?? "—"}`,
      from: userEmail,
      amount: totalEcart,
    });
  } catch (error) {
    console.error("Send avoir error:", error);
    return NextResponse.json(
      { error: `Erreur : ${String(error)}` },
      { status: 500 }
    );
  }
}
