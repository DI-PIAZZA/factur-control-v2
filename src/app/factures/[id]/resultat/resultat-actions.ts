"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function ajouterAuTarifAction({
  supplierId,
  invoiceId,
  refArticle,
  label,
  unitPrice,
}: {
  supplierId: string;
  invoiceId: string;
  refArticle: string | null;
  label: string;
  unitPrice: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { error } = await supabase.from("price_references").insert({
    supplier_id: supplierId,
    ref_article: refArticle ?? "",
    label,
    unit_price: unitPrice,
    unit: "pièce",
    valid_from: new Date().toISOString().slice(0, 10),
    origin: "manual",
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/factures/${invoiceId}/resultat`);
}

export async function ignorerAlertAction(alertId: string, invoiceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { error } = await supabase
    .from("reconciliation_alerts")
    .delete()
    .eq("id", alertId);

  if (error) throw new Error(error.message);
  revalidatePath(`/factures/${invoiceId}/resultat`);
}
