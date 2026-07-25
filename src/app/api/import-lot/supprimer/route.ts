import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { invoice_ids } = await req.json() as { invoice_ids: string[] };
    if (!Array.isArray(invoice_ids) || invoice_ids.length === 0) {
      return NextResponse.json({ error: "invoice_ids manquants" }, { status: 400 });
    }

    // Vérifier que les factures appartiennent bien au tenant de l'utilisateur
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();
    if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 403 });

    // Supprimer dans l'ordre : alertes → lignes → factures (contraintes FK)
    await supabase
      .from("reconciliation_alerts")
      .delete()
      .in("invoice_id", invoice_ids)
      .eq("tenant_id", profile.tenant_id);

    await supabase
      .from("invoice_lines")
      .delete()
      .in("invoice_id", invoice_ids);

    const { error } = await supabase
      .from("invoices")
      .delete()
      .in("id", invoice_ids)
      .eq("tenant_id", profile.tenant_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, supprimees: invoice_ids.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
