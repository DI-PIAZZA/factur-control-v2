import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_FIELDS = [
  "ref_article", "label", "unit",
  "unit_price",
  "remise_fournisseur_valeur", "remise_fournisseur_pct",
  "remise_producteur_valeur", "remise_producteur_pct",
  "gratuite_x", "gratuite_y",
  "gratuite_debut", "gratuite_fin",
  "rfa_prod_debut", "rfa_prod_fin",
];

const TEXT_FIELDS = ["ref_article", "label", "unit"];
const DATE_FIELDS = ["gratuite_debut", "gratuite_fin", "rfa_prod_debut", "rfa_prod_fin"];

// Champs qui déclenchent l'auto-remplissage des dates producteur (si null)
const GRATUITE_TRIGGERS = ["gratuite_x", "gratuite_y"];
const RFA_PROD_TRIGGERS = ["remise_producteur_valeur", "remise_producteur_pct"];

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { id, field, value } = await req.json();

    if (!id || !field || !ALLOWED_FIELDS.includes(field)) {
      return NextResponse.json({ error: "Champ non autorisé" }, { status: 400 });
    }

    const isText = TEXT_FIELDS.includes(field);
    const isDate = DATE_FIELDS.includes(field);

    let coerced: string | number | null;
    if (isDate) {
      coerced = (value === "" || value === null || value === undefined) ? null : String(value);
    } else if (isText) {
      coerced = String(value ?? "").slice(0, 500);
    } else {
      coerced = (value === "" || value === null || value === undefined) ? null : Number(value);
    }

    const updatePayload: Record<string, unknown> = { [field]: coerced };

    // Auto-remplissage des dates si le champ déclenche et que les dates sont nulles
    const year = new Date().getFullYear();
    const debut = `${year}-01-01`;
    const fin   = `${year}-12-31`;

    if (coerced !== null && coerced !== 0) {
      if (GRATUITE_TRIGGERS.includes(field)) {
        const { data: existing } = await supabase
          .from("price_references")
          .select("gratuite_debut, gratuite_fin")
          .eq("id", id)
          .single();
        if (!existing?.gratuite_debut) updatePayload.gratuite_debut = debut;
        if (!existing?.gratuite_fin)   updatePayload.gratuite_fin   = fin;
      }

      if (RFA_PROD_TRIGGERS.includes(field)) {
        const { data: existing } = await supabase
          .from("price_references")
          .select("rfa_prod_debut, rfa_prod_fin")
          .eq("id", id)
          .single();
        if (!existing?.rfa_prod_debut) updatePayload.rfa_prod_debut = debut;
        if (!existing?.rfa_prod_fin)   updatePayload.rfa_prod_fin   = fin;
      }
    }

    const { error } = await supabase
      .from("price_references")
      .update(updatePayload)
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, autoFilled: updatePayload });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
