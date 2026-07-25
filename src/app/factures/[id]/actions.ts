"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function deleteFactureAction(invoiceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Supprimer les lignes d'abord (FK)
  await supabase.from("invoice_lines").delete().eq("invoice_id", invoiceId);

  // Supprimer la facture
  const { error } = await supabase.from("invoices").delete().eq("id", invoiceId);
  if (error) throw new Error(error.message);

  redirect("/factures?success=supprime");
}
