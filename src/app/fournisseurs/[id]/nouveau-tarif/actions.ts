"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function addTarifAction(supplierId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ref_article = (formData.get("ref_article") as string)?.trim();
  const label = (formData.get("label") as string)?.trim() || null;
  const unit_price = parseFloat(
    (formData.get("unit_price") as string)?.replace(",", ".")
  );
  const unit = (formData.get("unit") as string)?.trim() || null;
  const valid_from =
    (formData.get("valid_from") as string) ||
    new Date().toISOString().slice(0, 10);

  if (!ref_article || isNaN(unit_price)) {
    redirect(`/fournisseurs/${supplierId}/nouveau-tarif?erreur=champs_invalides`);
  }

  const { error } = await supabase.from("price_references").insert({
    supplier_id: supplierId,
    ref_article,
    label,
    unit_price,
    unit,
    valid_from,
    origin: "manual",
  });

  if (error) {
    redirect(
      `/fournisseurs/${supplierId}/nouveau-tarif?erreur=${encodeURIComponent(error.message)}`
    );
  }

  redirect(`/fournisseurs/${supplierId}?success=1`);
}
