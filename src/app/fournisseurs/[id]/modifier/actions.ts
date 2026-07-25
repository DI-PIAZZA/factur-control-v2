"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function updateSupplierAction(supplierId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const email_facturation = (formData.get("email_facturation") as string)?.trim() || null;
  const price_column = (formData.get("price_column") as string)?.trim() || null;
  const nom_commercial = (formData.get("nom_commercial") as string)?.trim() || null;
  const code_postal = (formData.get("code_postal") as string)?.trim() || null;
  const ville = (formData.get("ville") as string)?.trim() || null;

  const { error } = await supabase
    .from("suppliers")
    .update({ email_facturation, price_column, nom_commercial, code_postal, ville })
    .eq("id", supplierId);

  if (error) {
    redirect(`/fournisseurs/${supplierId}/modifier?erreur=${encodeURIComponent(error.message)}`);
  }

  redirect(`/fournisseurs/${supplierId}?success=modif`);
}
