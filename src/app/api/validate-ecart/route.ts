import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const {
      alert_id,
      line_id,
      invoice_id,
      supplier_id,
      ref_article,
      label,
      unit_price,
    } = await req.json();

    // Vérifier que la facture appartient bien au tenant de l'utilisateur
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();
    if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 403 });

    // Ajouter la ligne au tarif du fournisseur
    const { error: tarifError } = await supabase
      .from("price_references")
      .insert({
        supplier_id,
        ref_article: ref_article || "",
        label,
        unit_price,
        unit: "pièce",
        valid_from: new Date().toISOString().slice(0, 10),
        origin: "validation",
      });

    if (tarifError && !tarifError.message.includes("duplicate")) {
      return NextResponse.json({ error: `Erreur tarif: ${tarifError.message}` }, { status: 500 });
    }

    // Supprimer l'alerte (elle est acceptée)
    await supabase
      .from("reconciliation_alerts")
      .delete()
      .eq("id", alert_id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
