import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface FactureLine {
  ref_article?: string;
  label: string;
  quantity: number;
  unit_price_invoiced: number;
  unit?: string;
  line_total?: number;
  line_type?: "article" | "consigne" | "remise_globale";
}

interface ClaudeFactureResponse {
  fournisseur_detecte: string;
  numero_facture: string;
  date_facture: string;
  total_ht: number;
  colonnes_prix: string[];
  lignes: FactureLine[];
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
    const invoicePriceColumn = (formData.get("invoice_price_column") as string) ?? "";
    const releveId = (formData.get("releve_id") as string) ?? "";

    if (!file || !supplierId) {
      return NextResponse.json({ error: "Fichier et supplier_id requis" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const messageContent = [
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      },
      {
        type: "text",
        text: `Tu es un expert en lecture de factures fournisseurs françaises.

Le fournisseur attendu est : "${supplierName}"
${invoicePriceColumn ? `\nColonne de prix à utiliser comme prix unitaire facturé : "${invoicePriceColumn}"\n` : ""}
Extrais les informations de cette facture et retourne UNIQUEMENT ce JSON (sans markdown) :
{
  "fournisseur_detecte": "nom tel qu'il apparaît sur la facture",
  "numero_facture": "numéro de facture",
  "date_facture": "YYYY-MM-DD",
  "total_ht": 0.00,
  "colonnes_prix": ["intitulé colonne prix 1", "intitulé colonne prix 2"],
  "lignes": [
    {
      "ref_article": "...",
      "label": "...",
      "quantity": 1,
      "unit_price_invoiced": 0.0000,
      "unit": "...",
      "line_total": 0.00,
      "line_type": "article"
    }
  ]
}

Règles pour line_type (priorité descendante) :
- "consigne" si le libellé contient CONSIGN, VIDE ou EMBALLAGE
- "remise_globale" si total < 0 OU libellé contient REMISE
- "article" sinon

Règles générales :
- Extrais TOUTES les lignes (articles, consignes, remises)
- quantity : quantité commandée/facturée
- unit_price_invoiced : prix unitaire HT tel que facturé${invoicePriceColumn ? ` (utilise la colonne "${invoicePriceColumn}")` : ""}
- line_total : quantité × prix unitaire HT
- total_ht : total HT global de la facture
- date_facture : au format YYYY-MM-DD (si absent, mettre null)
- numero_facture : numéro exact de la facture (si absent, mettre "")
- colonnes_prix : liste des intitulés exacts de toutes les colonnes de prix trouvées dans la facture (ex: "Prix unitaire HT", "PU HT", "Montant HT", etc.)`,
      },
    ];

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 8192,
        messages: [{ role: "user", content: messageContent }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `Erreur Claude API: ${err}` }, { status: 500 });
    }

    const result = await response.json();
    const content = result.content?.[0]?.text ?? "";

    let parsed: ClaudeFactureResponse;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Claude n'a pas retourné un JSON valide", raw: content }, { status: 422 });
    }

    const { fournisseur_detecte, numero_facture, date_facture, total_ht, lignes } = parsed;
    const colonnes_prix: string[] = Array.isArray(parsed.colonnes_prix) ? parsed.colonnes_prix : [];

    if (!Array.isArray(lignes) || lignes.length === 0) {
      return NextResponse.json({ error: "Aucune ligne extraite", raw: content }, { status: 422 });
    }

    // Récupérer le tenant_id via le profil
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 403 });

    // Uploader le PDF dans Supabase Storage
    let fileUrl: string | null = null;
    try {
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${profile.tenant_id}/${Date.now()}_${safeFileName}`;
      const { error: uploadError } = await supabase.storage
        .from("invoices")
        .upload(storagePath, Buffer.from(bytes), {
          contentType: "application/pdf",
          upsert: false,
        });
      if (!uploadError) fileUrl = storagePath;
    } catch {
      // Upload échoué : on continue sans URL (non bloquant)
    }

    // Créer la facture
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        tenant_id: profile.tenant_id,
        supplier_id: supplierId,
        invoice_number: numero_facture || null,
        invoice_date: date_facture || null,
        status: "pending",
        total_ht: Number(total_ht) || 0,
        file_url: fileUrl,
      })
      .select()
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: invoiceError?.message ?? "Erreur création facture" }, { status: 500 });
    }

    // Classifier et insérer les lignes
    const rows = lignes.map((l) => {
      const label = String(l.label ?? "");
      const lineTotal = Number(l.line_total) || Number(l.quantity) * Number(l.unit_price_invoiced);
      // Classifieur par mot-clé (priorité descendante, CLAUDE.md)
      let lineType: "article" | "consigne" | "remise_globale" = "article";
      if (/CONSIGN|VIDE|EMBALLAGE/i.test(label)) {
        lineType = "consigne";
      } else if (lineTotal < 0 || /REMISE/i.test(label)) {
        lineType = "remise_globale";
      }
      // Si line_type fourni par Claude et valide, on le respecte sauf si notre classifieur est plus fort
      if (l.line_type === "consigne") lineType = "consigne";

      return {
        invoice_id: invoice.id,
        supplier_id: supplierId,
        ref_article: String(l.ref_article ?? "").slice(0, 200) || null,
        label: label.slice(0, 500),
        quantity: Number(l.quantity) || 1,
        unit_price_invoiced: Number(l.unit_price_invoiced) || 0,
        unit: String(l.unit ?? "").slice(0, 50),
        line_total: lineTotal,
        line_type: lineType,
      };
    });

    const { error: linesError } = await supabase.from("invoice_lines").insert(rows);
    if (linesError) {
      return NextResponse.json({ error: linesError.message }, { status: 500 });
    }

    // Si import depuis un relevé → mettre à jour la ligne correspondante
    if (releveId && numero_facture) {
      const normalize = (n: string) => String(n).replace(/[\s\-]/g, "").replace(/^0+/, "").toLowerCase();
      const { data: releveLines } = await supabase
        .from("releve_lines")
        .select("id, invoice_number")
        .eq("releve_id", releveId)
        .eq("status", "missing");

      for (const rl of releveLines ?? []) {
        if (normalize(rl.invoice_number ?? "") === normalize(numero_facture)) {
          await supabase.from("releve_lines").update({
            status: "found",
            matched_invoice_id: invoice.id,
          }).eq("id", rl.id);
          break;
        }
      }
    }

    return NextResponse.json({
      success: true,
      invoice_id: invoice.id,
      fournisseur_detecte,
      numero_facture,
      date_facture,
      total_ht,
      count: rows.length,
      colonnes_prix,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
