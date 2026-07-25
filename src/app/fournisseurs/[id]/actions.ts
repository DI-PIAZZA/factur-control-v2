"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function updateLigneAction(ligneId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const num = (key: string) => {
    const v = formData.get(key);
    return v === "" || v === null ? 0 : Number(v);
  };

  const gx = num("gratuite_x");
  const gy = num("gratuite_y");

  await supabase.from("price_references").update({
    ref_article: String(formData.get("ref_article") ?? "").slice(0, 200),
    label: String(formData.get("label") ?? "").slice(0, 500),
    unit_price: num("unit_price"),
    unit: String(formData.get("unit") ?? "").slice(0, 50),
    remise_fournisseur_valeur: num("remise_fournisseur_valeur"),
    remise_fournisseur_pct: num("remise_fournisseur_pct"),
    remise_producteur_valeur: num("remise_producteur_valeur"),
    remise_producteur_pct: num("remise_producteur_pct"),
    gratuite_x: gx > 0 ? gx : null,
    gratuite_y: gy > 0 ? gy : null,
  }).eq("id", ligneId);

  revalidatePath("/fournisseurs/[id]", "page");
}

export async function saveInvoicePriceColumnAction(supplierId: string, priceColumn: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("suppliers").update({ invoice_price_column: priceColumn }).eq("id", supplierId);
  revalidatePath(`/fournisseurs/${supplierId}`);
}

export async function saveInvoicePriceColumnAndRedirectAction(formData: FormData) {
  "use server";
  const supplierId = String(formData.get("supplier_id") ?? "");
  const priceColumn = String(formData.get("price_column") ?? "").trim();
  if (!supplierId || !priceColumn) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("suppliers").update({ invoice_price_column: priceColumn }).eq("id", supplierId);
  revalidatePath("/fournisseurs");
  redirect("/fournisseurs?success=colonne");
}

export async function savePriceColumnAction(supplierId: string, priceColumn: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("suppliers").update({ price_column: priceColumn }).eq("id", supplierId);
  revalidatePath(`/fournisseurs/${supplierId}`);
}

export async function deleteTarifAction(supplierId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("price_references").delete().eq("supplier_id", supplierId);
  await supabase.from("suppliers").update({ tarif_file_path: null }).eq("id", supplierId);

  redirect(`/fournisseurs/${supplierId}/nouveau-tarif`);
}

export async function resetTarifForColumnChangeAction(formData: FormData) {
  "use server";
  const supplierId = String(formData.get("supplier_id") ?? "");
  if (!supplierId) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Supprime toutes les lignes de tarif
  await supabase.from("price_references").delete().eq("supplier_id", supplierId);
  // Remet price_column + tarif_file_path à null
  await supabase.from("suppliers").update({ price_column: null, tarif_file_path: null }).eq("id", supplierId);

  revalidatePath(`/fournisseurs/${supplierId}`);
  redirect(`/fournisseurs/${supplierId}/nouveau-tarif`);
}
