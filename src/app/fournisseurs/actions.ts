"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function deleteSupplierAction(supplierId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Supprimer les lignes de tarif en cascade
  await supabase.from("price_references").delete().eq("supplier_id", supplierId);
  // Supprimer le fournisseur
  await supabase.from("suppliers").delete().eq("id", supplierId);

  redirect("/fournisseurs?success=supprime");
}
