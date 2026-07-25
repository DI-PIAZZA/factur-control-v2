import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { invoice_id } = await req.json();
    if (!invoice_id) return NextResponse.json({ error: "invoice_id manquant" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    // Récupérer la facture + fournisseur (avec les périodes de conditions commerciales)
    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .select("*, suppliers(id, price_column, name, remise_fourn_debut, remise_fourn_fin, remise_prod_debut, remise_prod_fin, gratuite_debut, gratuite_fin)")
      .eq("id", invoice_id)
      .single();

    if (invErr || !invoice) return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supplier = invoice.suppliers as any;
    const supplierId = supplier.id;

    // Date de la facture pour vérification des périodes (null = pas de vérification)
    const invoiceDate: Date | null = invoice.invoice_date ? new Date(invoice.invoice_date) : null;

    // Vérifie si une date tombe dans une période (null = non définie → pas de restriction)
    function inPeriod(debut: string | null, fin: string | null): boolean {
      if (!debut || !fin || !invoiceDate) return true; // pas de période définie → on applique toujours
      const d = new Date(debut);
      const f = new Date(fin);
      return invoiceDate >= d && invoiceDate <= f;
    }

    const remiseFournActive = inPeriod(supplier.remise_fourn_debut, supplier.remise_fourn_fin);
    const remiseProdActive  = inPeriod(supplier.remise_prod_debut, supplier.remise_prod_fin);
    const gratuitActive     = inPeriod(supplier.gratuite_debut, supplier.gratuite_fin);

    // Récupérer le profil pour le tenant_id
    const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
    if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 401 });
    const tenantId = profile.tenant_id;

    // Récupérer les lignes articles de la facture
    const { data: invoiceLines } = await supabase
      .from("invoice_lines")
      .select("*")
      .eq("invoice_id", invoice_id)
      .eq("line_type", "article");

    if (!invoiceLines || invoiceLines.length === 0) {
      return NextResponse.json({ error: "Aucune ligne article à rapprocher" }, { status: 400 });
    }

    // Récupérer le tarif de référence du fournisseur
    const { data: pricerefs } = await supabase
      .from("price_references")
      .select("*")
      .eq("supplier_id", supplierId);

    // Construire un index par ref_article (lowercase) pour la recherche rapide
    const refIndex = new Map<string, Record<string, unknown>>();
    const labelIndex = new Map<string, Record<string, unknown>>();
    for (const pr of pricerefs ?? []) {
      if (pr.ref_article) refIndex.set(pr.ref_article.toLowerCase().trim(), pr);
      if (pr.label) labelIndex.set(pr.label.toLowerCase().trim(), pr);
    }

    // Supprimer les alertes existantes pour cette facture (re-rapprochement possible)
    await supabase.from("reconciliation_alerts").delete().eq("invoice_id", invoice_id);

    const alerts: Record<string, unknown>[] = [];

    for (const line of invoiceLines) {
      const refKey = (line.ref_article ?? "").toLowerCase().trim();
      const labelKey = (line.label ?? "").toLowerCase().trim();

      // Chercher d'abord par ref_article, puis par label
      const priceRef = refIndex.get(refKey) ?? labelIndex.get(labelKey) ?? null;

      const unitPriceInvoiced = Number(line.unit_price_invoiced) || 0;

      if (!priceRef) {
        // Article hors tarif
        alerts.push({
          invoice_id,
          invoice_line_id: line.id,
          supplier_id: supplierId,
          tenant_id: tenantId,
          ref_article: line.ref_article,
          label: line.label,
          unit_price_invoiced: unitPriceInvoiced,
          unit_price_reference: null,
          delta: null,
          alert_type: "not_in_tarif",
        });
      } else {
        // Calculer le prix net de référence
        // Les remises ne sont appliquées que si la facture est dans la période de validité
        const base = Number(priceRef.unit_price) || 0;
        const rfVal = remiseFournActive ? (Number(priceRef.remise_fournisseur_valeur) || 0) : 0;
        const rfPct = remiseFournActive ? (Number(priceRef.remise_fournisseur_pct) || 0) : 0;
        const rpVal = remiseProdActive  ? (Number(priceRef.remise_producteur_valeur) || 0) : 0;
        const rpPct = remiseProdActive  ? (Number(priceRef.remise_producteur_pct) || 0) : 0;
        const netPrice = base - rfVal - (base * rfPct / 100) - rpVal - (base * rpPct / 100);

        // Détecter si une remise était active mais n'a pas été appliquée sur la facture
        // (facture conforme au prix brut alors qu'une remise était en cours)
        const baseWithoutDiscount = base;
        const hasDiscounts = (remiseFournActive && (rfVal > 0 || rfPct > 0)) ||
                             (remiseProdActive  && (rpVal > 0 || rpPct > 0));
        const remiseNonAppliquee = hasDiscounts &&
          Math.abs(unitPriceInvoiced - baseWithoutDiscount) < 0.01 &&
          netPrice < baseWithoutDiscount - 0.01;

        const delta = unitPriceInvoiced - netPrice;

        if (delta > 0.01) {
          alerts.push({
            invoice_id,
            invoice_line_id: line.id,
            supplier_id: supplierId,
            tenant_id: tenantId,
            ref_article: line.ref_article,
            label: line.label,
            unit_price_invoiced: unitPriceInvoiced,
            unit_price_reference: netPrice,
            delta,
            alert_type: "price_mismatch",
          });
        } else if (remiseNonAppliquee) {
          // La remise était en cours mais n'a pas été déduite sur la facture
          alerts.push({
            invoice_id,
            invoice_line_id: line.id,
            supplier_id: supplierId,
            tenant_id: tenantId,
            ref_article: line.ref_article,
            label: line.label,
            unit_price_invoiced: unitPriceInvoiced,
            unit_price_reference: netPrice,
            delta: unitPriceInvoiced - netPrice,
            alert_type: "remise_non_appliquee",
          });
        }
      }
    }

    // Insérer les alertes
    if (alerts.length > 0) {
      await supabase.from("reconciliation_alerts").insert(alerts);
    }

    // Mettre à jour le statut de la facture
    await supabase.from("invoices").update({ status: "checked" }).eq("id", invoice_id);

    return NextResponse.json({
      ok: true,
      total_lines: invoiceLines.length,
      alerts: alerts.length,
      price_mismatch: alerts.filter((a) => a.alert_type === "price_mismatch").length,
      not_in_tarif: alerts.filter((a) => a.alert_type === "not_in_tarif").length,
      remise_non_appliquee: alerts.filter((a) => a.alert_type === "remise_non_appliquee").length,
    });
  } catch (err) {
    console.error("[reconcile]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
