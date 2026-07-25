import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractPdfsFromZip } from "@/lib/extract-zip";

export const maxDuration = 300;

// ─── Types ────────────────────────────────────────────────────────────────────

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
  releves?: Array<{
    numero_facture: string;
    date_facture?: string;
    montant_ht?: number;
    montant_ttc?: number;
  }>;
}

interface ConfigFichier {
  nom_fichier: string;
  supplier_id: string;
  price_column: string;
  invoice_price_column?: string;
  creer_fournisseur?: boolean;
  nom_fournisseur?: string;
  siret?: string;
  creer_tarif?: boolean;   // true = créer price_references depuis les lignes facture
  colonne_tarif?: string;  // colonne choisie comme prix de référence
}

// ─── Extraction Claude ────────────────────────────────────────────────────────

async function extraireFacture(
  pdfBuffer: ArrayBuffer,
  supplierName: string,
  invoicePriceColumn: string,
  apiKey: string
): Promise<ClaudeFactureResponse> {
  const base64 = Buffer.from(pdfBuffer).toString("base64");

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
      messages: [
        {
          role: "user",
          content: [
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
  "colonnes_prix": ["intitulé colonne prix 1"],
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
  ],
  "releves": [
    {
      "numero_facture": "...",
      "date_facture": "YYYY-MM-DD",
      "montant_ht": 0.00,
      "montant_ttc": 0.00
    }
  ]
}

Règles pour line_type (priorité descendante) :
- "consigne" si le libellé contient CONSIGN, VIDE ou EMBALLAGE
- "remise_globale" si total < 0 OU libellé contient REMISE
- "article" sinon

Règles pour les relevés :
- Identifie les sections "RELEVE DE FACTURES" ou tableaux listant des factures antérieures
- Chaque ligne du relevé = 1 facture antérieure avec date et montants
- Stocke ces factures dans le tableau "releves" (pas dans "lignes")

Règles générales :
- Extrais TOUTES les lignes
- quantity : quantité commandée/facturée
- unit_price_invoiced : prix unitaire HT tel que facturé${invoicePriceColumn ? ` (utilise la colonne "${invoicePriceColumn}")` : ""}
- line_total : quantité × prix unitaire HT
- date_facture : format YYYY-MM-DD ou null
- numero_facture : numéro exact ou ""`,
            },
          ],
        },
      ],
    }),
  });

  const result = await response.json();
  const text = result.content?.[0]?.text ?? "";
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

// ─── Rapprochement interne ────────────────────────────────────────────────────

async function rapprocher(
  invoiceId: string,
  supplierId: string,
  tenantId: string,
  invoiceDate: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<void> {
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, suppliers(id, price_column, remise_fourn_debut, remise_fourn_fin)")
    .eq("id", invoiceId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supplier = invoice?.suppliers as any;

  const invDate = invoiceDate ? new Date(invoiceDate) : null;
  function inPeriod(debut: string | null, fin: string | null): boolean {
    if (!debut || !fin || !invDate) return true;
    return invDate >= new Date(debut) && invDate <= new Date(fin);
  }

  const remiseFournActive = inPeriod(supplier?.remise_fourn_debut, supplier?.remise_fourn_fin);

  const { data: invoiceLines } = await supabase
    .from("invoice_lines")
    .select("*")
    .eq("invoice_id", invoiceId)
    .eq("line_type", "article");

  if (!invoiceLines || invoiceLines.length === 0) return;

  const { data: pricerefs } = await supabase
    .from("price_references")
    .select("*")
    .eq("supplier_id", supplierId);

  const refIndex = new Map<string, Record<string, unknown>>();
  const labelIndex = new Map<string, Record<string, unknown>>();
  for (const pr of pricerefs ?? []) {
    if (pr.ref_article) refIndex.set(pr.ref_article.toLowerCase().trim(), pr);
    if (pr.label) labelIndex.set(pr.label.toLowerCase().trim(), pr);
  }

  await supabase.from("reconciliation_alerts").delete().eq("invoice_id", invoiceId);

  const alerts: Record<string, unknown>[] = [];
  for (const line of invoiceLines) {
    const refKey   = (line.ref_article ?? "").toLowerCase().trim();
    const labelKey = (line.label ?? "").toLowerCase().trim();
    const priceRef = refIndex.get(refKey) ?? labelIndex.get(labelKey) ?? null;
    const unitPriceInvoiced = Number(line.unit_price_invoiced) || 0;

    if (!priceRef) {
      alerts.push({
        invoice_id: invoiceId, invoice_line_id: line.id, supplier_id: supplierId,
        tenant_id: tenantId, ref_article: line.ref_article, label: line.label,
        unit_price_invoiced: unitPriceInvoiced, unit_price_reference: null,
        delta: null, alert_type: "not_in_tarif",
      });
    } else {
      const base  = Number(priceRef.unit_price) || 0;
      const rfVal = remiseFournActive ? (Number(priceRef.remise_fournisseur_valeur) || 0) : 0;
      const rfPct = remiseFournActive ? (Number(priceRef.remise_fournisseur_pct) || 0)   : 0;
      const netPrice = base - rfVal - (base * rfPct / 100);
      const delta = unitPriceInvoiced - netPrice;

      if (delta > 0.01) {
        alerts.push({
          invoice_id: invoiceId, invoice_line_id: line.id, supplier_id: supplierId,
          tenant_id: tenantId, ref_article: line.ref_article, label: line.label,
          unit_price_invoiced: unitPriceInvoiced, unit_price_reference: netPrice,
          delta, alert_type: "price_mismatch",
        });
      } else {
        const hasDiscounts = remiseFournActive && (rfVal > 0 || rfPct > 0);
        if (hasDiscounts && Math.abs(unitPriceInvoiced - base) < 0.01 && netPrice < base - 0.01) {
          alerts.push({
            invoice_id: invoiceId, invoice_line_id: line.id, supplier_id: supplierId,
            tenant_id: tenantId, ref_article: line.ref_article, label: line.label,
            unit_price_invoiced: unitPriceInvoiced, unit_price_reference: netPrice,
            delta: unitPriceInvoiced - netPrice, alert_type: "remise_non_appliquee",
          });
        }
      }
    }
  }

  if (alerts.length > 0) {
    await supabase.from("reconciliation_alerts").insert(alerts);
  }
  await supabase.from("invoices").update({ status: "checked" }).eq("id", invoiceId);
}

// ─── Route principale ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY manquante" }, { status: 500 });

    const formData = await req.formData();

    // Config JSON (tableau ConfigFichier)
    const configRaw = formData.get("config") as string;
    const config: ConfigFichier[] = JSON.parse(configRaw ?? "[]");

    // Récupérer les fichiers (PDF individuels ou ZIP unique)
    const fichiers = formData.getAll("fichiers") as File[];

    // Construire la liste de buffers à traiter
    interface EntreeFichier { nom: string; buffer: ArrayBuffer }
    const entrees: EntreeFichier[] = [];

    for (const f of fichiers) {
      const buf = await f.arrayBuffer();
      if (f.name.toLowerCase().endsWith(".zip") || f.type === "application/zip") {
        const pdfs = extractPdfsFromZip(Buffer.from(buf));
        for (const p of pdfs) entrees.push({ nom: p.nom, buffer: p.buffer.buffer as ArrayBuffer });
      } else {
        entrees.push({ nom: f.name, buffer: buf });
      }
    }

    // Profil / tenant
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();
    if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 403 });
    const tenantId = profile.tenant_id;

    // Index config par nom de fichier
    const configByNom = new Map<string, ConfigFichier>(
      config.map((c) => [c.nom_fichier, c])
    );

    // Cache des supplier_id créés en cours de batch (évite les doublons SIRET)
    const supplierCache = new Map<string, string>(); // clé: siret|nom → supplier_id

    const resultats = [];

    for (const entree of entrees) {
      const cfg = configByNom.get(entree.nom);
      if (!cfg) {
        resultats.push({ nom_fichier: entree.nom, statut: "ignoré", raison: "Aucune config fournie" });
        continue;
      }

      try {
        // Créer le fournisseur si nécessaire (avec cache pour éviter les doublons dans le batch)
        let supplierId = cfg.supplier_id;
        if (cfg.creer_fournisseur && !supplierId) {
          const cacheKey = `${cfg.siret ?? ""}|${cfg.nom_fournisseur ?? ""}`;
          const cached = supplierCache.get(cacheKey);
          if (cached) {
            supplierId = cached;
          } else {
            // Vérifier s'il existe déjà (autre import ou contrainte SIRET)
            if (cfg.siret) {
              const { data: existing } = await supabase
                .from("suppliers")
                .select("id")
                .eq("tenant_id", tenantId)
                .eq("siret", cfg.siret)
                .maybeSingle();
              if (existing) {
                supplierId = existing.id;
                supplierCache.set(cacheKey, supplierId);
              }
            }
            if (!supplierId) {
              const { data: newSupp, error: suppErr } = await supabase
                .from("suppliers")
                .insert({
                  tenant_id: tenantId,
                  name: cfg.nom_fournisseur ?? "Nouveau fournisseur",
                  siret: cfg.siret ?? null,
                })
                .select("id")
                .single();
              if (suppErr || !newSupp) throw new Error(suppErr?.message ?? "Création fournisseur échouée");
              supplierId = newSupp.id;
              supplierCache.set(cacheKey, supplierId);
            }
          }
        }

        if (!supplierId) {
          resultats.push({ nom_fichier: entree.nom, statut: "ignoré", raison: "supplier_id manquant" });
          continue;
        }

        // Récupérer les infos du fournisseur
        const { data: supp } = await supabase
          .from("suppliers")
          .select("name, nom_commercial, price_column")
          .eq("id", supplierId)
          .single();

        const supplierName   = supp?.nom_commercial || supp?.name || "";
        const priceColumn    = cfg.price_column || supp?.price_column || "";
        const invPriceColumn = cfg.invoice_price_column ?? priceColumn;

        // Extraction IA
        const extracted = await extraireFacture(
          entree.buffer,
          supplierName,
          invPriceColumn,
          apiKey
        );

        // Doublon : même fournisseur + même numéro → supprimer l'ancien avant d'importer
        if (extracted.numero_facture) {
          const { data: existante } = await supabase
            .from("invoices")
            .select("id")
            .eq("supplier_id", supplierId)
            .eq("invoice_number", extracted.numero_facture)
            .maybeSingle();

          if (existante) {
            await supabase.from("reconciliation_alerts").delete().eq("invoice_id", existante.id);
            await supabase.from("invoice_lines").delete().eq("invoice_id", existante.id);
            await supabase.from("invoices").delete().eq("id", existante.id);
          }
        }

        // Upload PDF
        let fileUrl: string | null = null;
        try {
          const safeNom = entree.nom.replace(/[^a-zA-Z0-9._-]/g, "_");
          const storagePath = `${tenantId}/${Date.now()}_${safeNom}`;
          const { error: uploadErr } = await supabase.storage
            .from("invoices")
            .upload(storagePath, Buffer.from(entree.buffer), {
              contentType: "application/pdf",
              upsert: false,
            });
          if (!uploadErr) fileUrl = storagePath;
        } catch { /* non bloquant */ }

        // Créer la facture
        const { data: invoice, error: invErr } = await supabase
          .from("invoices")
          .insert({
            tenant_id: tenantId,
            supplier_id: supplierId,
            invoice_number: extracted.numero_facture || null,
            invoice_date: extracted.date_facture || null,
            status: "pending",
            total_ht: Number(extracted.total_ht) || 0,
            file_url: fileUrl,
          })
          .select()
          .single();

        if (invErr || !invoice) throw new Error(invErr?.message ?? "Création facture échouée");

        // Classifier et insérer les lignes
        const rows = (extracted.lignes ?? []).map((l) => {
          const label = String(l.label ?? "");
          const lineTotal = Number(l.line_total) || Number(l.quantity) * Number(l.unit_price_invoiced);
          let lineType: "article" | "consigne" | "remise_globale" = "article";
          if (/CONSIGN|VIDE|EMBALLAGE/i.test(label)) lineType = "consigne";
          else if (lineTotal < 0 || /REMISE/i.test(label)) lineType = "remise_globale";
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

        if (rows.length > 0) {
          await supabase.from("invoice_lines").insert(rows);
        }

        // Insérer les relevés de factures
        if (extracted.releves && extracted.releves.length > 0) {
          const relevesRows = extracted.releves.map((r) => ({
            invoice_id: invoice.id,
            tenant_id: tenantId,
            referenced_invoice_number: r.numero_facture || null,
            referenced_invoice_date: r.date_facture || null,
            referenced_amount_ht: Number(r.montant_ht) || null,
            referenced_amount_ttc: Number(r.montant_ttc) || null,
          }));
          await supabase.from("invoice_references").insert(relevesRows);
        }

        // Créer le tarif depuis les lignes de cette facture (origin: "facture")
        if (cfg.creer_tarif && cfg.colonne_tarif) {
          const lignesTarif = rows
            .filter((r) => r.line_type === "article" && r.unit_price_invoiced > 0)
            .map((r) => ({
              supplier_id: supplierId,
              ref_article: r.ref_article ?? "",
              label: r.label,
              unit_price: r.unit_price_invoiced,
              unit: r.unit || "pièce",
              valid_from: extracted.date_facture || new Date().toISOString().slice(0, 10),
              origin: "facture",
            }));
          if (lignesTarif.length > 0) {
            await supabase.from("price_references").insert(lignesTarif);
          }
          // Mémoriser la colonne choisie sur la fiche fournisseur
          await supabase
            .from("suppliers")
            .update({ price_column: cfg.colonne_tarif })
            .eq("id", supplierId);
        }

        // Rapprochement si le fournisseur a un tarif + colonne
        let nbAlertes = 0;
        if (priceColumn) {
          await rapprocher(invoice.id, supplierId, tenantId, extracted.date_facture, supabase);
          const { data: alertsData } = await supabase
            .from("reconciliation_alerts")
            .select("id", { count: "exact" })
            .eq("invoice_id", invoice.id);
          nbAlertes = alertsData?.length ?? 0;
        }

        resultats.push({
          nom_fichier: entree.nom,
          statut: "ok",
          invoice_id: invoice.id,
          supplier_id: supplierId,
          numero_facture: extracted.numero_facture,
          date_facture: extracted.date_facture,
          total_ht: extracted.total_ht,
          nb_lignes: rows.length,
          nb_alertes: nbAlertes,
          rapproche: !!priceColumn,
        });
      } catch (e) {
        resultats.push({
          nom_fichier: entree.nom,
          statut: "erreur",
          raison: String(e),
        });
      }
    }

    return NextResponse.json({ resultats });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
