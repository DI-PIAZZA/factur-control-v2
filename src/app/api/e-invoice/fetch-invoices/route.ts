import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    // Récupérer le tenant_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile) return NextResponse.json({ error: "Profil non trouvé" }, { status: 404 });

    const tenantId = profile.tenant_id;

    // Récupérer les credentials e-facturation autorisées
    const { data: credentials } = await supabase
      .from("e_invoice_credentials")
      .select("supplier_id, platform, oauth_token")
      .eq("tenant_id", tenantId)
      .eq("platform", "chorus");

    if (!credentials || credentials.length === 0) {
      return NextResponse.json({ message: "Aucune credential Chorus trouvée" });
    }

    let totalFetched = 0;

    for (const cred of credentials) {
      try {
        // Appeler l'API Chorus Pro
        const chorusRes = await fetch(
          "https://api.chorus-pro.gouv.fr/api/invoices",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${cred.oauth_token}`,
              "Accept": "application/json",
            },
          }
        );

        if (!chorusRes.ok) {
          console.warn(
            `Chorus error for supplier ${cred.supplier_id}:`,
            chorusRes.status
          );
          continue;
        }

        const chorusData = await chorusRes.json();
        const invoices = chorusData.invoices || [];

        // Insérer les factures récupérées
        for (const inv of invoices) {
          // Vérifier que la facture n'existe pas déjà
          const { data: existing } = await supabase
            .from("invoices")
            .select("id")
            .eq("supplier_id", cred.supplier_id)
            .eq("invoice_number", inv.number)
            .single();

          if (existing) continue; // Facture déjà importée

          // Créer la facture
          const { data: newInvoice } = await supabase
            .from("invoices")
            .insert({
              tenant_id: tenantId,
              supplier_id: cred.supplier_id,
              invoice_number: inv.number,
              invoice_date: inv.date || new Date().toISOString().split("T")[0],
              status: "pending",
              // Note: file_path peut rester null car il s'agit d'une facture e-invoice
            })
            .select()
            .single();

          if (newInvoice) {
            totalFetched++;

            // Ici on pourrait appeler /api/extract-facture si on a le PDF
            // Mais pour l'instant, Chorus ne retourne que des métadonnées
          }
        }
      } catch (err) {
        console.error(
          `Error fetching from Chorus for supplier ${cred.supplier_id}:`,
          err
        );
      }
    }

    return NextResponse.json({
      success: true,
      totalFetched,
      message: `${totalFetched} facture(s) importée(s) depuis e-facturation`,
    });
  } catch (err) {
    console.error("Erreur fetch-invoices:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
