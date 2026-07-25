import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractPdfsFromZip } from "@/lib/extract-zip";

export const maxDuration = 120;

interface InfoFournisseur {
  nom: string;
  siret: string | null;
  numero_facture: string | null;
  date_facture: string | null;
  colonnes_prix: string[];
}

async function detecterFournisseur(
  pdfBuffer: ArrayBuffer,
  apiKey: string
): Promise<InfoFournisseur> {
  const base64 = Buffer.from(pdfBuffer).toString("base64");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
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
              text: `Analyse cette facture PDF. Extrais UNIQUEMENT ces informations et retourne UNIQUEMENT le JSON ci-dessous, sans texte autour :
{
  "nom": "nom exact du fournisseur émetteur de la facture",
  "siret": "numéro SIRET à 14 chiffres sans espace, ou null",
  "numero_facture": "numéro de facture ou null",
  "date_facture": "date au format YYYY-MM-DD ou null",
  "colonnes_prix": ["liste des en-têtes de colonnes contenant des prix unitaires dans le tableau de la facture, ex: ['PU NET HT', 'Prix Brut HT']. Tableau vide si aucune colonne trouvée."]
}`,
            },
          ],
        },
      ],
    }),
  });

  const result = await response.json();
  const text = result.content?.[0]?.text ?? "{}";
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { nom: "", siret: null, numero_facture: null, date_facture: null, colonnes_prix: [] };
  }
}

function normaliserNom(nom: string): string {
  return nom.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY manquante" }, { status: 500 });

    const formData = await req.formData();
    const raw = formData.getAll("fichiers") as File[];

    if (raw.length === 0) {
      return NextResponse.json({ error: "Aucun fichier reçu" }, { status: 400 });
    }

    // Normaliser : extraire les PDFs des ZIP éventuels
    interface EntreeFichier { nom: string; buffer: ArrayBuffer }
    const fichiers: EntreeFichier[] = [];
    for (const f of raw) {
      const buf = await f.arrayBuffer();
      if (f.name.toLowerCase().endsWith(".zip") || f.type === "application/zip") {
        const pdfs = extractPdfsFromZip(Buffer.from(buf));
        for (const p of pdfs) fichiers.push({ nom: p.nom, buffer: p.buffer.buffer as ArrayBuffer });
      } else {
        fichiers.push({ nom: f.name, buffer: buf });
      }
    }

    // Charger tous les fournisseurs du tenant
    const { data: fournisseurs } = await supabase
      .from("suppliers")
      .select("id, name, nom_commercial, siret, price_column");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parSiret = new Map<string, any>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parNom   = new Map<string, any>();
    for (const f of fournisseurs ?? []) {
      if (f.siret) parSiret.set(String(f.siret).replace(/\s/g, ""), f);
      const nomKey = normaliserNom(f.nom_commercial || f.name || "");
      if (nomKey) parNom.set(nomKey, f);
    }

    // Vérifier quels fournisseurs ont un tarif
    const { data: tarifsExistants } = await supabase
      .from("price_references")
      .select("supplier_id");

    const avecTarif = new Set<string>((tarifsExistants ?? []).map((t) => t.supplier_id));

    // Analyser chaque PDF
    const resultats = [];
    // Suivre les clés pour lesquelles on a déjà inclus un preview (1 par nouveau fournisseur)
    const previewsEnvoyes = new Set<string>();

    for (const fichier of fichiers) {
      let info: InfoFournisseur;
      try {
        info = await detecterFournisseur(fichier.buffer, apiKey);
      } catch (e) {
        resultats.push({
          nom_fichier: fichier.nom,
          erreur: `Analyse IA échouée : ${String(e)}`,
          statut: "erreur" as const,
        });
        continue;
      }

      // Trouver le fournisseur correspondant
      const siretNet = (info.siret ?? "").replace(/\s/g, "");
      const nomNet   = normaliserNom(info.nom ?? "");
      const match    = (siretNet && parSiret.get(siretNet)) || (nomNet && parNom.get(nomNet)) || null;

      const aTarif   = match ? avecTarif.has(match.id) : false;
      const aColonne = match?.price_column ? true : false;

      const statut = !match
        ? "nouveau_fournisseur"
        : !aTarif
        ? "sans_tarif"
        : !aColonne
        ? "sans_colonne"
        : "pret";

      // Inclure le PDF en base64 pour le premier fichier de chaque nouveau fournisseur (≤ 1 Mo)
      const needsConfig = statut === "nouveau_fournisseur" || statut === "sans_tarif";
      const clePreview  = info.siret || info.nom || fichier.nom;
      let preview_b64: string | undefined;
      if (needsConfig && clePreview && !previewsEnvoyes.has(clePreview)) {
        const taille = fichier.buffer.byteLength;
        if (taille <= 1_048_576) { // ≤ 1 Mo
          preview_b64 = Buffer.from(fichier.buffer).toString("base64");
        }
        previewsEnvoyes.add(clePreview);
      }

      resultats.push({
        nom_fichier: fichier.nom,
        fournisseur_detecte: info.nom,
        siret_detecte: info.siret,
        numero_facture: info.numero_facture,
        date_facture: info.date_facture,
        colonnes_prix: Array.isArray(info.colonnes_prix) ? info.colonnes_prix : [],
        fournisseur_match: match
          ? { id: match.id, name: match.nom_commercial || match.name, siret: match.siret, price_column: match.price_column }
          : null,
        a_tarif: aTarif,
        statut,
        ...(preview_b64 ? { preview_b64 } : {}),
      });
    }

    return NextResponse.json({ resultats });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
