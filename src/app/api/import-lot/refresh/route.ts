import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { invoiceIds } = await req.json();

    if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json({ error: "invoiceIds required" }, { status: 400 });
    }

    // Récupérer les données à jour de chaque facture
    const results = await Promise.all(
      invoiceIds.map(async (invoiceId) => {
        const { data: invoice } = await supabase
          .from("invoices")
          .select("id, invoice_number, invoice_date, total_ht")
          .eq("id", invoiceId)
          .single();

        const { data: lines } = await supabase
          .from("invoice_lines")
          .select("id")
          .eq("invoice_id", invoiceId);

        const { data: alerts } = await supabase
          .from("reconciliation_alerts")
          .select("id")
          .eq("invoice_id", invoiceId);

        return {
          invoice_id: invoiceId,
          numero_facture: invoice?.invoice_number,
          date_facture: invoice?.invoice_date,
          total_ht: invoice?.total_ht,
          nb_lignes: lines?.length ?? 0,
          nb_alertes: alerts?.length ?? 0,
        };
      })
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error("Refresh error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
