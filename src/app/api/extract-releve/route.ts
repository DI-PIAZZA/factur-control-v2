import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ReleveLineRaw {
  invoice_number: string;
  amount_ht: number;
}

interface ClaudeReleveResponse {
  fournisseur_detecte: string;
  lignes: ReleveLineRaw[];
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY manquante" }, { status: 500 });

    const formData = await req.formData();
    const file = formData.get("pdf") as File;
    const supplierId = formData.get("supplier_id") as string;
    const supplierName = (formData.get("supplier_name") as string) ?? "";

    if (!file || !supplierId) {
      return NextResponse.json({ error: "Fichier et supplier_id requis" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    // Extraction Claude
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 4096,
        messages: [{
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: base64 },
            },
            {
              type: "text",
              text: `Tu es un expert en lecture de relevés de compte fournisseurs français.
Le fournisseur attendu est : "${supplierName}"

Extrais la liste de toutes les factures présentes dans ce relevé de compte.
Retourne UNIQUEMENT ce JSON (sans markdown) :
{
  "fournisseur_detecte": "nom tel qu'il apparaît sur le document",
  "lignes": [
    {
      "invoice_number": "numéro exact de la facture",
      "amount_ht": 0.00
    }
  ]
}

Règles :
- invoice_number : numéro exact de la facture tel qu'il apparaît (FA2024-001, 2024-00123, etc.)
- amount_ht : montant HT de la facture (nombre décimal, positif)
- Si le montant HT n'est pas disponible, utilise le montant TTC
- Extrais TOUTES les lignes de factures du relevé, sans exception`,
            },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `Erreur Claude API: ${err}` }, { status: 500 });
    }

    const result = await response.json();
    const content = result.content?.[0]?.text ?? "";

    let parsed: ClaudeReleveResponse;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Claude n'a pas retourné un JSON valide", raw: content }, { status: 422 });
    }

    const { lignes } = parsed;
    if (!Array.isArray(lignes) || lignes.length === 0) {
      return NextResponse.json({ error: "Aucune ligne extraite", raw: content }, { status: 422 });
    }

    // Récupérer le tenant
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();
    if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 403 });

    // Upload PDF
    let fileUrl: string | null = null;
    try {
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${profile.tenant_id}/releves/${Date.now()}_${safeFileName}`;
      const { error: uploadError } = await supabase.storage
        .from("invoices")
        .upload(storagePath, Buffer.from(bytes), { contentType: "application/pdf", upsert: false });
      if (!uploadError) fileUrl = storagePath;
    } catch { /* non bloquant */ }

    // Créer le relevé
    const { data: releve, error: releveError } = await supabase
      .from("releves")
      .insert({ tenant_id: profile.tenant_id, supplier_id: supplierId, file_url: fileUrl })
      .select()
      .single();
    if (releveError || !releve) {
      return NextResponse.json({ error: releveError?.message ?? "Erreur création relevé" }, { status: 500 });
    }

    // Récupérer toutes les factures du fournisseur en base
    const { data: existingInvoices } = await supabase
      .from("invoices")
      .select("id, invoice_number")
      .eq("supplier_id", supplierId);

    const invoiceMap: Record<string, string> = {};
    for (const inv of existingInvoices ?? []) {
      if (inv.invoice_number) {
        // Normalise le numéro pour la comparaison (supprime espaces, tirets, zéros initiaux)
        const key = String(inv.invoice_number).replace(/[\s\-]/g, "").replace(/^0+/, "").toLowerCase();
        invoiceMap[key] = inv.id;
      }
    }

    // Construire les lignes avec statut
    const rows = lignes.map((l) => {
      const num = String(l.invoice_number ?? "").replace(/[\s\-]/g, "").replace(/^0+/, "").toLowerCase();
      const matchedId = invoiceMap[num] ?? null;
      return {
        releve_id: releve.id,
        invoice_number: String(l.invoice_number ?? ""),
        amount_ht: Number(l.amount_ht) || 0,
        status: matchedId ? "found" : "missing",
        matched_invoice_id: matchedId,
      };
    });

    const { error: linesError } = await supabase.from("releve_lines").insert(rows);
    if (linesError) return NextResponse.json({ error: linesError.message }, { status: 500 });

    return NextResponse.json({ success: true, releve_id: releve.id, count: rows.length });

  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
