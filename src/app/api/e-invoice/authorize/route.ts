import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { supplierId, platform } = await req.json();

    if (!supplierId || !platform) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    // Vérifier que le fournisseur appartient à l'utilisateur
    const { data: supplier } = await supabase
      .from("suppliers")
      .select("id")
      .eq("id", supplierId)
      .single();

    if (!supplier) {
      return NextResponse.json({ error: "Fournisseur non trouvé" }, { status: 404 });
    }

    // Chorus Pro OAuth
    if (platform === "chorus") {
      const clientId = process.env.CHORUS_CLIENT_ID;
      const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/e-invoice/callback`;

      const authUrl = new URL("https://api.chorus-pro.gouv.fr/oauth2/authorize");
      authUrl.searchParams.append("client_id", clientId || "");
      authUrl.searchParams.append("redirect_uri", redirectUri);
      authUrl.searchParams.append("response_type", "code");
      authUrl.searchParams.append("scope", "invoices:read");
      authUrl.searchParams.append("state", supplierId);

      return NextResponse.json({ authUrl: authUrl.toString() });
    }

    // Storefact OAuth (à implémenter)
    if (platform === "storefact") {
      return NextResponse.json(
        { error: "Storefact non implémenté" },
        { status: 501 }
      );
    }

    return NextResponse.json(
      { error: "Plateforme inconnue" },
      { status: 400 }
    );
  } catch (err) {
    console.error("Erreur authorize:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
