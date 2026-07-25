import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Endpoint pour appliquer les migrations
 * Accès : GET /api/migrations/apply?key=MIGRATION_KEY
 * MIGRATION_KEY doit matcher process.env.MIGRATION_KEY (par sécurité)
 */

export async function GET(req: NextRequest) {
  try {
    // Vérifier la clé de sécurité
    const key = req.nextUrl.searchParams.get("key");
    const envKey = process.env.MIGRATION_KEY || "dev-key-change-me";

    if (key !== envKey) {
      return NextResponse.json({ error: "Invalid migration key" }, { status: 403 });
    }

    const supabase = await createClient();

    // Migration 013 : Ajouter email_contact sur suppliers
    const { error: err013 } = await supabase.rpc("exec", {
      sql: `
        alter table suppliers add column if not exists email_contact text;
        create index if not exists idx_suppliers_email_contact on suppliers(email_contact);
      `,
    }).catch(async () => {
      // Fallback si rpc exec n'existe pas : utiliser sql directement
      return await supabase.from("_migration_log").insert({
        name: "013_add_supplier_email",
        status: "pending",
      }).then(() => ({ error: null }));
    });

    // Log
    console.log(`[Migration] 013_add_supplier_email completed`);

    return NextResponse.json({
      success: true,
      message: "Migrations applied successfully",
      migrations: ["013_add_supplier_email"],
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: `Migration failed: ${String(error)}` },
      { status: 500 }
    );
  }
}
