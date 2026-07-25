import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const normalize = (n: string) =>
  String(n).replace(/[\s\-\.]/g, "").replace(/^0+/, "").toLowerCase();

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { releve_id } = await req.json();
    if (!releve_id) return NextResponse.json({ error: "releve_id manquant" }, { status: 400 });

    // Récupérer le relevé pour avoir le supplier_id
    const { data: releve } = await supabase
      .from("releves")
      .select("supplier_id")
      .eq("id", releve_id)
      .single();

    if (!releve) return NextResponse.json({ error: "Relevé introuvable" }, { status: 404 });

    // Toutes les factures du fournisseur
    const { data: invoices } = await supabase
      .from("invoices")
      .select("id, invoice_number")
      .eq("supplier_id", releve.supplier_id);

    const invoiceMap: Record<string, string> = {};
    for (const inv of invoices ?? []) {
      if (inv.invoice_number) {
        invoiceMap[normalize(inv.invoice_number)] = inv.id;
      }
    }

    // Toutes les lignes du relevé
    const { data: lines } = await supabase
      .from("releve_lines")
      .select("id, invoice_number, status")
      .eq("releve_id", releve_id);

    let updated = 0;
    for (const line of lines ?? []) {
      const key = normalize(line.invoice_number ?? "");
      const matchedId = invoiceMap[key] ?? null;
      const newStatus = matchedId ? "found" : "missing";

      if (newStatus !== line.status || (newStatus === "found" && matchedId)) {
        await supabase.from("releve_lines").update({
          status: newStatus,
          matched_invoice_id: matchedId,
        }).eq("id", line.id);
        if (newStatus === "found") updated++;
      }
    }

    return NextResponse.json({ success: true, updated });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
