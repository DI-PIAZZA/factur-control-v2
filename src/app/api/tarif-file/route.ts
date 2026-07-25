import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/tarif-file?supplierId=xxx
// Génère une URL signée (1h) et redirige vers le fichier
export async function GET(req: NextRequest) {
  const supplierId = req.nextUrl.searchParams.get("supplierId");
  if (!supplierId) {
    return NextResponse.json({ error: "supplierId requis" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // Récupération du chemin (RLS garantit l'appartenance au tenant)
  const { data: supplier, error } = await supabase
    .from("suppliers")
    .select("tarif_file_path")
    .eq("id", supplierId)
    .single();

  if (error || !supplier?.tarif_file_path) {
    return NextResponse.json({ error: "Fichier non trouvé" }, { status: 404 });
  }

  // Génération de l'URL signée (1 heure) avec le client auth de l'utilisateur
  const { data: signedData, error: signedError } = await supabase.storage
    .from("tarifs")
    .createSignedUrl(supplier.tarif_file_path, 3600);

  if (signedError || !signedData?.signedUrl) {
    return NextResponse.json({ error: "Impossible de générer l'URL", detail: signedError?.message }, { status: 500 });
  }

  return NextResponse.redirect(signedData.signedUrl);
}
