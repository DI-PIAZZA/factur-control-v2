import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL("/login", req.url));

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // supplierId
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(`/factures/autoriser-fournisseurs?error=${error}`, req.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/factures/autoriser-fournisseurs?error=missing_params", req.url)
      );
    }

    const supplierId = state;

    // Vérifier que le fournisseur appartient à l'utilisateur
    const { data: supplier } = await supabase
      .from("suppliers")
      .select("id")
      .eq("id", supplierId)
      .single();

    if (!supplier) {
      return NextResponse.redirect(
        new URL("/factures/autoriser-fournisseurs?error=supplier_not_found", req.url)
      );
    }

    // Échanger le code contre un token (Chorus Pro)
    const clientId = process.env.CHORUS_CLIENT_ID;
    const clientSecret = process.env.CHORUS_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/e-invoice/callback`;

    const tokenRes = await fetch("https://api.chorus-pro.gouv.fr/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId || "",
        client_secret: clientSecret || "",
        redirect_uri: redirectUri,
      }).toString(),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("Chorus token error:", tokenData);
      return NextResponse.redirect(
        new URL("/factures/autoriser-fournisseurs?error=token_failed", req.url)
      );
    }

    // Récupérer le tenant_id de l'utilisateur
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.redirect(
        new URL("/factures/autoriser-fournisseurs?error=profile_not_found", req.url)
      );
    }

    // Sauvegarder les credentials
    const { error: dbError } = await supabase
      .from("e_invoice_credentials")
      .upsert({
        tenant_id: profile.tenant_id,
        supplier_id: supplierId,
        platform: "chorus",
        oauth_token: tokenData.access_token,
        oauth_refresh_token: tokenData.refresh_token || null,
        oauth_token_expires_at: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
          : null,
      });

    if (dbError) {
      console.error("DB error:", dbError);
      return NextResponse.redirect(
        new URL("/factures/autoriser-fournisseurs?error=db_error", req.url)
      );
    }

    // Marquer le fournisseur comme autorisé
    await supabase
      .from("suppliers")
      .update({ e_invoice_authorized: true })
      .eq("id", supplierId);

    // Rediriger avec succès
    return NextResponse.redirect(
      new URL("/factures/autoriser-fournisseurs?success=authorized", req.url)
    );
  } catch (err) {
    console.error("Erreur callback:", err);
    return NextResponse.redirect(
      new URL("/factures/autoriser-fournisseurs?error=server_error", req.url)
    );
  }
}
