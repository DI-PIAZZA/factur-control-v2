"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveConditionsAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const supplierId = formData.get("supplier_id") as string;
  if (!supplierId) throw new Error("supplier_id manquant");

  const toDate = (val: FormDataEntryValue | null) =>
    val && String(val).trim() ? String(val).trim() : null;

  const { error } = await supabase
    .from("suppliers")
    .update({
      remise_fourn_debut: toDate(formData.get("remise_fourn_debut")),
      remise_fourn_fin:   toDate(formData.get("remise_fourn_fin")),
      rfa_fourn_debut:    toDate(formData.get("rfa_fourn_debut")),
      rfa_fourn_fin:      toDate(formData.get("rfa_fourn_fin")),
    })
    .eq("id", supplierId);

  if (error) throw new Error(error.message);

  revalidatePath(`/fournisseurs/${supplierId}`);
}
